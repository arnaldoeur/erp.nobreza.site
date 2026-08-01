/**
 * Colaboração: tarefas, conversas internas, calendário e biblioteca de ficheiros.
 *
 * O chat funcionava com subscrições em tempo real do Supabase. Sem esse
 * serviço, as mensagens novas são obtidas por sondagem: o cliente pergunta
 * periodicamente o que chegou depois da última mensagem que já tem
 * (`?since=`), o que devolve um conjunto vazio na esmagadora maioria dos
 * casos e é barato com o índice (group_id, created_at).
 */

import { Router } from 'express';
import { asyncHandler, badRequest, forbidden, notFound } from '../utils/errors.js';
import { query, queryOne, transaction } from '../db/pool.js';
import { newId } from '../utils/ids.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAction } from '../services/log.service.js';
import {
    requireString, optionalString, requireUuid, optionalUuid, requireEnum,
    optionalEnum, requireDate, optionalDate, toDateOnly, parseJson, toJson,
    requireBoolean, pagination,
} from '../utils/validate.js';

export const collabRouter = Router();
collabRouter.use(requireAuth);

// =============================================================================
// TAREFAS
// =============================================================================

function mapTask(row) {
    return {
        id: row.id,
        company_id: String(row.company_id),
        creator_id: row.creator_id ?? '',
        assigned_to: row.assigned_to ?? undefined,
        title: row.title,
        description: row.description ?? undefined,
        status: row.status,
        priority: row.priority,
        due_date: row.due_date ?? undefined,
        location: row.location ?? undefined,
        created_at: row.created_at,
        creator_name: row.creator_name ?? undefined,
        assignee_name: row.assignee_name ?? undefined,
    };
}

const TASK_SELECT = `
    SELECT t.*, c.name AS creator_name, a.name AS assignee_name
      FROM tasks t
      LEFT JOIN users c ON c.id = t.creator_id
      LEFT JOIN users a ON a.id = t.assigned_to
`;

collabRouter.get('/tasks', asyncHandler(async (req, res) => {
    const rows = await query(
        `${TASK_SELECT} WHERE t.company_id = ? ORDER BY t.created_at DESC LIMIT 500`,
        [req.auth.companyId]
    );
    res.json(rows.map(mapTask));
}));

/**
 * Cria ou atualiza uma tarefa, sincronizando o evento de calendário associado.
 *
 * A versão anterior inseria um evento novo a cada gravação, sem qualquer
 * ligação à tarefa — editar uma tarefa três vezes deixava três eventos
 * duplicados no calendário. Agora a ligação é a coluna `erp_events.task_id`,
 * com restrição de unicidade a garanti-la.
 */
collabRouter.post('/tasks', asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const id = optionalUuid(body.id, 'tarefa');

    const data = {
        title: requireString(body.title, 'título'),
        description: optionalString(body.description, 'descrição', { max: 5000 }),
        status: optionalEnum(body.status, 'estado', ['PENDING', 'PROGRESS', 'DONE'], 'PENDING'),
        priority: optionalEnum(body.priority, 'prioridade', ['LOW', 'MEDIUM', 'HIGH'], 'MEDIUM'),
        dueDate: toDateOnly(body.due_date ?? body.dueDate, 'data limite'),
        location: optionalString(body.location, 'local', { max: 255 }),
        assignedTo: optionalUuid(body.assigned_to ?? body.assignedTo, 'responsável'),
    };

    const taskId = await transaction(async (connection) => {
        let resolvedId = id;

        if (resolvedId) {
            const [existing] = await connection.execute(
                'SELECT id FROM tasks WHERE id = ? AND company_id = ?',
                [resolvedId, req.auth.companyId]
            );
            if (existing.length === 0) throw notFound('Tarefa não encontrada.');

            await connection.execute(
                `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?,
                        due_date = ?, location = ?, assigned_to = ?
                  WHERE id = ? AND company_id = ?`,
                [data.title, data.description, data.status, data.priority,
                 data.dueDate, data.location, data.assignedTo, resolvedId, req.auth.companyId]
            );
        } else {
            resolvedId = newId();
            await connection.execute(
                `INSERT INTO tasks
                    (id, company_id, creator_id, assigned_to, title, description, status, priority, due_date, location)
                 VALUES (?,?,?,?,?,?,?,?,?,?)`,
                [resolvedId, req.auth.companyId, req.auth.userId, data.assignedTo, data.title,
                 data.description, data.status, data.priority, data.dueDate, data.location]
            );
        }

        // Sincronização com o calendário, idempotente por `task_id`.
        if (data.dueDate) {
            const eventStatus = data.status === 'DONE' ? 'COMPLETED' : 'PENDING';
            const startTime = new Date(`${data.dueDate}T09:00:00.000Z`);
            const endTime = new Date(`${data.dueDate}T10:00:00.000Z`);

            await connection.execute(
                `INSERT INTO erp_events
                    (id, company_id, task_id, title, description, start_time, end_time,
                     location, type, priority, status, created_by)
                 VALUES (?,?,?,?,?,?,?,?,'TASK',?,?,?)
                 ON DUPLICATE KEY UPDATE
                    title = VALUES(title), description = VALUES(description),
                    start_time = VALUES(start_time), end_time = VALUES(end_time),
                    location = VALUES(location), priority = VALUES(priority), status = VALUES(status)`,
                [newId(), req.auth.companyId, resolvedId, `Tarefa: ${data.title}`.slice(0, 255),
                 data.description, startTime, endTime, data.location,
                 data.priority, eventStatus, req.auth.userId]
            );
        } else {
            // Se a data limite foi removida, o evento deixa de fazer sentido.
            await connection.execute('DELETE FROM erp_events WHERE task_id = ? AND company_id = ?', [resolvedId, req.auth.companyId]);
        }

        return resolvedId;
    });

    const row = await queryOne(`${TASK_SELECT} WHERE t.id = ?`, [taskId]);
    res.status(id ? 200 : 201).json(mapTask(row));
}));

collabRouter.delete('/tasks/:id', asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'tarefa');

    const task = await queryOne('SELECT creator_id FROM tasks WHERE id = ? AND company_id = ?', [id, req.auth.companyId]);
    if (!task) throw notFound('Tarefa não encontrada.');

    const isPrivileged = req.auth.isSuperAdmin || req.auth.role === 'ADMIN';
    if (!isPrivileged && task.creator_id !== req.auth.userId) {
        throw forbidden('Apenas quem criou a tarefa, ou um administrador, a pode eliminar.');
    }

    await query('DELETE FROM tasks WHERE id = ? AND company_id = ?', [id, req.auth.companyId]);
    res.json({ ok: true });
}));

// =============================================================================
// CONVERSAS INTERNAS
// =============================================================================

/**
 * Confirma que o utilizador pertence ao grupo e que o grupo é da sua empresa.
 *
 * Chamado por todas as rotas de conversa. A verificação equivalente no
 * Supabase era uma policy recursiva que teve de ser reescrita cinco vezes
 * (migrações 40, 42, 44, 45, 46) por entrar em ciclo infinito.
 */
async function assertGroupAccess(groupId, auth) {
    const group = await queryOne(
        `SELECT g.id, g.company_id,
                EXISTS(SELECT 1 FROM erp_chat_group_members m WHERE m.group_id = g.id AND m.user_id = ?) AS is_member
           FROM erp_chat_groups g
          WHERE g.id = ? AND g.company_id = ?`,
        [auth.userId, groupId, auth.companyId]
    );
    if (!group) throw notFound('Grupo não encontrado.');
    if (group.is_member !== 1 && !auth.isSuperAdmin && auth.role !== 'ADMIN') {
        throw forbidden('Não pertence a este grupo.');
    }
    return group;
}

collabRouter.get('/chat/groups', asyncHandler(async (req, res) => {
    // Um administrador vê todos os grupos da empresa; os restantes veem
    // apenas aqueles de que são membros.
    const seesAll = req.auth.isSuperAdmin || req.auth.role === 'ADMIN';

    const rows = await query(
        `SELECT g.*, (SELECT COUNT(*) FROM erp_chat_group_members m WHERE m.group_id = g.id) AS member_count
           FROM erp_chat_groups g
          WHERE g.company_id = ?
            ${seesAll ? '' : 'AND EXISTS (SELECT 1 FROM erp_chat_group_members m WHERE m.group_id = g.id AND m.user_id = ?)'}
          ORDER BY g.name`,
        seesAll ? [req.auth.companyId] : [req.auth.companyId, req.auth.userId]
    );

    res.json(rows.map((row) => ({
        id: row.id,
        company_id: String(row.company_id),
        name: row.name,
        description: row.description ?? undefined,
        image_url: row.image_url ?? undefined,
        member_count: Number(row.member_count),
        created_at: row.created_at,
    })));
}));

collabRouter.post('/chat/groups', asyncHandler(async (req, res) => {
    const name = requireString(req.body?.name, 'nome do grupo');
    const description = optionalString(req.body?.description, 'descrição', { max: 5000 });

    const id = await transaction(async (connection) => {
        const groupId = newId();
        await connection.execute(
            'INSERT INTO erp_chat_groups (id, company_id, name, description, created_by) VALUES (?,?,?,?,?)',
            [groupId, req.auth.companyId, name, description, req.auth.userId]
        );
        // Quem cria o grupo é o seu primeiro administrador.
        await connection.execute(
            "INSERT INTO erp_chat_group_members (group_id, user_id, role) VALUES (?,?,'ADMIN')",
            [groupId, req.auth.userId]
        );
        return groupId;
    });

    const row = await queryOne('SELECT * FROM erp_chat_groups WHERE id = ?', [id]);
    res.status(201).json({ id: row.id, company_id: String(row.company_id), name: row.name, description: row.description ?? undefined });
}));

collabRouter.put('/chat/groups/:id', asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'grupo');
    await assertGroupAccess(id, req.auth);

    await query(
        'UPDATE erp_chat_groups SET name = ?, description = ?, image_url = ? WHERE id = ? AND company_id = ?',
        [requireString(req.body?.name, 'nome do grupo'),
         optionalString(req.body?.description, 'descrição', { max: 5000 }),
         optionalString(req.body?.image_url, 'imagem', { max: 5_000_000 }),
         id, req.auth.companyId]
    );

    const row = await queryOne('SELECT * FROM erp_chat_groups WHERE id = ?', [id]);
    res.json({
        id: row.id,
        company_id: String(row.company_id),
        name: row.name,
        description: row.description ?? undefined,
        image_url: row.image_url ?? undefined,
    });
}));

collabRouter.delete('/chat/groups/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'grupo');
    const result = await query('DELETE FROM erp_chat_groups WHERE id = ? AND company_id = ?', [id, req.auth.companyId]);
    if (result.affectedRows === 0) throw notFound('Grupo não encontrado.');
    res.json({ ok: true });
}));

collabRouter.get('/chat/groups/:id/members', asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'grupo');
    await assertGroupAccess(id, req.auth);

    const rows = await query(
        `SELECT m.group_id, m.user_id, m.role, m.joined_at, u.name, u.email, u.photo
           FROM erp_chat_group_members m
           JOIN users u ON u.id = m.user_id
          WHERE m.group_id = ?
          ORDER BY u.name`,
        [id]
    );

    res.json(rows.map((row) => ({
        group_id: row.group_id,
        user_id: row.user_id,
        role: row.role,
        joined_at: row.joined_at,
        user: { id: row.user_id, name: row.name, email: row.email, photo: row.photo ?? undefined },
    })));
}));

collabRouter.post('/chat/groups/:id/members', asyncHandler(async (req, res) => {
    const groupId = requireUuid(req.params.id, 'grupo');
    await assertGroupAccess(groupId, req.auth);

    const userId = requireUuid(req.body?.userId, 'utilizador');
    const role = optionalEnum(req.body?.role, 'papel', ['ADMIN', 'MEMBER'], 'MEMBER');

    // Confirma que a pessoa a adicionar é da mesma empresa. Sem isto, seria
    // possível adicionar ao grupo o identificador de alguém de outra empresa.
    const member = await queryOne('SELECT id FROM users WHERE id = ? AND company_id = ?', [userId, req.auth.companyId]);
    if (!member) throw badRequest('O utilizador indicado não pertence a esta empresa.');

    await query(
        `INSERT INTO erp_chat_group_members (group_id, user_id, role) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE role = VALUES(role)`,
        [groupId, userId, role]
    );

    res.json({ ok: true });
}));

collabRouter.delete('/chat/groups/:id/members/:userId', asyncHandler(async (req, res) => {
    const groupId = requireUuid(req.params.id, 'grupo');
    const userId = requireUuid(req.params.userId, 'utilizador');
    await assertGroupAccess(groupId, req.auth);

    await query('DELETE FROM erp_chat_group_members WHERE group_id = ? AND user_id = ?', [groupId, userId]);
    res.json({ ok: true });
}));

/**
 * Mensagens de um grupo.
 *
 * Com `?since=<ISO>` devolve apenas o que chegou depois desse instante — é o
 * que substitui a subscrição em tempo real.
 */
collabRouter.get('/chat/groups/:id/messages', asyncHandler(async (req, res) => {
    const groupId = requireUuid(req.params.id, 'grupo');
    await assertGroupAccess(groupId, req.auth);

    const since = optionalDate(req.query.since, 'since');
    const { limit } = pagination(req.query, { defaultLimit: 100, maxLimit: 500 });

    const rows = await query(
        `SELECT m.*, u.photo AS user_photo
           FROM erp_chat_messages m
           LEFT JOIN users u ON u.id = m.user_id
          WHERE m.group_id = ? AND m.company_id = ?
            ${since ? 'AND m.created_at > ?' : ''}
          ORDER BY m.created_at DESC
          LIMIT ${limit}`,
        since ? [groupId, req.auth.companyId, since] : [groupId, req.auth.companyId]
    );

    // Ordem cronológica na resposta; o LIMIT desceu do fim para apanhar as
    // mensagens mais recentes.
    res.json(rows.reverse().map((row) => ({
        id: row.id,
        company_id: String(row.company_id),
        group_id: row.group_id,
        user_id: row.user_id ?? '',
        user_name: row.user_name ?? 'Utilizador removido',
        user_photo: row.user_photo ?? undefined,
        content: row.content,
        mentions: parseJson(row.mentions, []),
        created_at: row.created_at,
    })));
}));

collabRouter.post('/chat/groups/:id/messages', asyncHandler(async (req, res) => {
    const groupId = requireUuid(req.params.id, 'grupo');
    await assertGroupAccess(groupId, req.auth);

    const content = requireString(req.body?.content, 'mensagem', { max: 10000 });
    const mentions = Array.isArray(req.body?.mentions)
        ? req.body.mentions.filter((mention) => typeof mention === 'string').slice(0, 50)
        : [];

    // O autor vem do token, não do corpo do pedido: ninguém escreve em nome
    // de outra pessoa.
    const author = await queryOne('SELECT name FROM users WHERE id = ?', [req.auth.userId]);
    const id = newId();

    await query(
        `INSERT INTO erp_chat_messages (id, company_id, group_id, user_id, user_name, content, mentions)
         VALUES (?,?,?,?,?,?,?)`,
        [id, req.auth.companyId, groupId, req.auth.userId, author?.name ?? 'Utilizador', content, toJson(mentions)]
    );

    // Notificar quem foi mencionado.
    if (mentions.length > 0) {
        const placeholders = mentions.map(() => '?').join(',');
        const mentioned = await query(
            `SELECT id FROM users WHERE company_id = ? AND id IN (${placeholders}) AND id <> ?`,
            [req.auth.companyId, ...mentions, req.auth.userId]
        );
        if (mentioned.length > 0) {
            const values = mentioned.map((user) => [
                newId(), req.auth.companyId, user.id, 'MENTION',
                `${author?.name ?? 'Alguém'} mencionou-o numa conversa`,
                content.slice(0, 200),
            ]);
            await query(
                `INSERT INTO notifications (id, company_id, user_id, type, title, content)
                 VALUES ${values.map(() => '(?,?,?,?,?,?)').join(',')}`,
                values.flat()
            );
        }
    }

    const row = await queryOne('SELECT * FROM erp_chat_messages WHERE id = ?', [id]);
    res.status(201).json({
        id: row.id,
        company_id: String(row.company_id),
        group_id: row.group_id,
        user_id: row.user_id,
        user_name: row.user_name,
        content: row.content,
        mentions: parseJson(row.mentions, []),
        created_at: row.created_at,
    });
}));

// =============================================================================
// CALENDÁRIO
// =============================================================================

function mapEvent(row, attendees = []) {
    return {
        id: row.id,
        companyId: Number(row.company_id),
        title: row.title,
        description: row.description ?? undefined,
        startTime: row.start_time,
        endTime: row.end_time,
        location: row.location ?? undefined,
        type: row.type,
        priority: row.priority,
        status: row.status,
        isPersonal: row.is_personal === 1,
        createdBy: row.created_by ?? '',
        attendees,
    };
}

collabRouter.get('/events', asyncHandler(async (req, res) => {
    const from = optionalDate(req.query.from, 'from');
    const to = optionalDate(req.query.to, 'to');

    const conditions = ['e.company_id = ?'];
    const params = [req.auth.companyId];
    if (from) { conditions.push('e.end_time >= ?'); params.push(from); }
    if (to) { conditions.push('e.start_time <= ?'); params.push(to); }

    // Eventos pessoais só são visíveis a quem os criou.
    conditions.push('(e.is_personal = 0 OR e.created_by = ?)');
    params.push(req.auth.userId);

    const events = await query(
        `SELECT e.* FROM erp_events e WHERE ${conditions.join(' AND ')} ORDER BY e.start_time LIMIT 1000`,
        params
    );
    if (events.length === 0) return res.json([]);

    const placeholders = events.map(() => '?').join(',');
    const attendees = await query(
        `SELECT a.event_id, a.user_id, a.status, u.name, u.email
           FROM erp_event_attendees a
           JOIN users u ON u.id = a.user_id
          WHERE a.event_id IN (${placeholders})`,
        events.map((event) => event.id)
    );

    const byEvent = new Map();
    for (const attendee of attendees) {
        if (!byEvent.has(attendee.event_id)) byEvent.set(attendee.event_id, []);
        byEvent.get(attendee.event_id).push({
            eventId: attendee.event_id,
            userId: attendee.user_id,
            status: attendee.status,
            user: { name: attendee.name, email: attendee.email },
        });
    }

    res.json(events.map((event) => mapEvent(event, byEvent.get(event.id) ?? [])));
}));

collabRouter.post('/events', asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const title = requireString(body.title, 'título');
    const startTime = requireDate(body.startTime, 'início');
    const endTime = requireDate(body.endTime, 'fim');

    if (endTime < startTime) throw badRequest('A hora de fim não pode ser anterior à de início.');

    const attendeeIds = Array.isArray(body.attendeeIds)
        ? body.attendeeIds.map((id) => requireUuid(id, 'participante')).slice(0, 100)
        : [];

    const id = await transaction(async (connection) => {
        const eventId = newId();
        await connection.execute(
            `INSERT INTO erp_events
                (id, company_id, title, description, start_time, end_time, location,
                 type, priority, status, is_personal, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [eventId, req.auth.companyId, title,
             optionalString(body.description, 'descrição', { max: 5000 }),
             startTime, endTime,
             optionalString(body.location, 'local', { max: 255 }),
             optionalEnum(body.type, 'tipo', ['MEETING', 'TASK', 'REMINDER'], 'MEETING'),
             optionalEnum(body.priority, 'prioridade', ['LOW', 'MEDIUM', 'HIGH'], 'MEDIUM'),
             optionalEnum(body.status, 'estado', ['PENDING', 'COMPLETED', 'OVERDUE'], 'PENDING'),
             requireBoolean(body.isPersonal, false) ? 1 : 0,
             req.auth.userId]
        );

        for (const attendeeId of attendeeIds) {
            // A subconsulta garante que só entram pessoas da mesma empresa.
            await connection.execute(
                `INSERT IGNORE INTO erp_event_attendees (event_id, user_id)
                 SELECT ?, id FROM users WHERE id = ? AND company_id = ?`,
                [eventId, attendeeId, req.auth.companyId]
            );
        }

        return eventId;
    });

    const row = await queryOne('SELECT * FROM erp_events WHERE id = ?', [id]);
    res.status(201).json(mapEvent(row));
}));

collabRouter.delete('/events/:id', asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'evento');

    const event = await queryOne('SELECT created_by FROM erp_events WHERE id = ? AND company_id = ?', [id, req.auth.companyId]);
    if (!event) throw notFound('Evento não encontrado.');

    const isPrivileged = req.auth.isSuperAdmin || req.auth.role === 'ADMIN';
    if (!isPrivileged && event.created_by !== req.auth.userId) {
        throw forbidden('Apenas quem criou o evento, ou um administrador, o pode eliminar.');
    }

    await query('DELETE FROM erp_events WHERE id = ? AND company_id = ?', [id, req.auth.companyId]);
    res.json({ ok: true });
}));

/** Cada participante responde apenas pela sua própria presença. */
collabRouter.patch('/events/:id/attendance', asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'evento');
    const status = requireEnum(req.body?.status, 'estado', ['PENDING', 'ACCEPTED', 'DECLINED']);

    const result = await query(
        `UPDATE erp_event_attendees a
           JOIN erp_events e ON e.id = a.event_id
            SET a.status = ?
          WHERE a.event_id = ? AND a.user_id = ? AND e.company_id = ?`,
        [status, id, req.auth.userId, req.auth.companyId]
    );
    if (result.affectedRows === 0) throw notFound('Não consta como participante deste evento.');

    res.json({ ok: true });
}));
