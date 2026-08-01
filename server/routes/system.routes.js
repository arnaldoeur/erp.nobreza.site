/**
 * Registo de atividade, notificações e gestão da plataforma.
 */

import { Router } from 'express';
import { asyncHandler, badRequest, conflict, notFound } from '../utils/errors.js';
import { query, queryOne, transaction } from '../db/pool.js';
import { newId } from '../utils/ids.js';
import { requireAuth, requireAdmin, requireSuperAdmin, requireRole } from '../middleware/auth.js';
import { logAction } from '../services/log.service.js';
import { sendActivationInvite } from '../services/auth.service.js';
import {
    requireString, optionalString, requireUuid, optionalUuid,
    parseJson, toJson, toNumber, pagination,
} from '../utils/validate.js';

export const systemRouter = Router();
systemRouter.use(requireAuth);

// =============================================================================
// REGISTO DE ATIVIDADE
// =============================================================================

function mapLog(row) {
    return {
        id: row.id,
        companyId: Number(row.company_id),
        timestamp: row.timestamp,
        userId: row.user_id ?? undefined,
        userName: row.user_name ?? 'Sistema',
        action: row.action,
        details: row.details ?? '',
    };
}

systemRouter.get('/logs', requireRole('ADMIN', 'ADMINISTRATIVE'), asyncHandler(async (req, res) => {
    const { limit, offset } = pagination(req.query, { defaultLimit: 200, maxLimit: 1000 });
    const userId = optionalUuid(req.query.userId, 'utilizador');

    const rows = await query(
        `SELECT l.*, COALESCE(u.name, l.user_name) AS user_name
           FROM system_logs l
           LEFT JOIN users u ON u.id = l.user_id
          WHERE l.company_id = ? ${userId ? 'AND l.user_id = ?' : ''}
          ORDER BY l.timestamp DESC
          LIMIT ${limit} OFFSET ${offset}`,
        userId ? [req.auth.companyId, userId] : [req.auth.companyId]
    );

    res.json(rows.map(mapLog));
}));

/**
 * Regista uma ação desencadeada pela interface.
 *
 * O servidor determina quem, quando e de onde — o cliente só descreve o quê.
 * Antes, o registo era inteiramente construído no browser, incluindo o autor.
 */
systemRouter.post('/logs', asyncHandler(async (req, res) => {
    const action = requireString(req.body?.action, 'ação', { max: 128 });
    const details = optionalString(req.body?.details, 'detalhes', { max: 5000 });

    const user = await queryOne('SELECT name FROM users WHERE id = ?', [req.auth.userId]);
    await logAction({
        companyId: req.auth.companyId,
        userId: req.auth.userId,
        userName: user?.name,
        action,
        details,
        ip: req.ip,
    });

    res.status(201).json({ ok: true });
}));

systemRouter.delete('/logs', requireAdmin, asyncHandler(async (req, res) => {
    const result = await query('DELETE FROM system_logs WHERE company_id = ?', [req.auth.companyId]);

    // O próprio ato de limpar o registo fica registado. Caso contrário, apagar
    // o histórico não deixaria qualquer vestígio.
    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'LOGS_CLEARED', details: `${result.affectedRows} registos eliminados`, ip: req.ip,
    });

    res.json({ deleted: result.affectedRows });
}));

// =============================================================================
// NOTIFICAÇÕES
// =============================================================================

function mapNotification(row) {
    return {
        id: row.id,
        userId: row.user_id ?? undefined,
        type: row.type,
        title: row.title,
        content: row.content ?? '',
        read: row.is_read === 1,
        metadata: parseJson(row.metadata, undefined),
        createdAt: row.created_at,
    };
}

systemRouter.get('/notifications', asyncHandler(async (req, res) => {
    const { limit } = pagination(req.query, { defaultLimit: 50, maxLimit: 200 });
    const rows = await query(
        `SELECT * FROM notifications
          WHERE company_id = ? AND user_id = ?
          ORDER BY created_at DESC
          LIMIT ${limit}`,
        [req.auth.companyId, req.auth.userId]
    );
    res.json(rows.map(mapNotification));
}));

systemRouter.get('/notifications/unread-count', asyncHandler(async (req, res) => {
    const row = await queryOne(
        'SELECT COUNT(*) AS count FROM notifications WHERE company_id = ? AND user_id = ? AND is_read = 0',
        [req.auth.companyId, req.auth.userId]
    );
    res.json({ count: Number(row.count) });
}));

systemRouter.patch('/notifications/:id/read', asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'notificação');
    // A condição por `user_id` impede marcar como lida a notificação de outra pessoa.
    const result = await query(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
        [id, req.auth.userId]
    );
    if (result.affectedRows === 0) throw notFound('Notificação não encontrada.');
    res.json({ ok: true });
}));

systemRouter.post('/notifications/read-all', asyncHandler(async (req, res) => {
    const result = await query(
        'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
        [req.auth.userId]
    );
    res.json({ updated: result.affectedRows });
}));

/**
 * Cria uma notificação para membros da equipa.
 *
 * Restrita a administradores e limitada à própria empresa: sem esta
 * restrição, qualquer utilizador poderia enviar avisos em nome do sistema.
 */
systemRouter.post('/notifications', requireAdmin, asyncHandler(async (req, res) => {
    const title = requireString(req.body?.title, 'título');
    const content = optionalString(req.body?.content, 'conteúdo', { max: 5000 });
    const type = optionalString(req.body?.type, 'tipo', { max: 64 }) ?? 'SYSTEM';

    const targetIds = Array.isArray(req.body?.userIds)
        ? req.body.userIds.map((id) => requireUuid(id, 'destinatário'))
        : null;

    const recipients = targetIds
        ? await query(
            `SELECT id FROM users WHERE company_id = ? AND active = 1 AND id IN (${targetIds.map(() => '?').join(',')})`,
            [req.auth.companyId, ...targetIds]
        )
        : await query('SELECT id FROM users WHERE company_id = ? AND active = 1', [req.auth.companyId]);

    if (recipients.length === 0) return res.json({ created: 0 });

    const values = recipients.map((user) => [
        newId(), req.auth.companyId, user.id, type, title, content,
        toJson(req.body?.metadata ?? null),
    ]);

    await query(
        `INSERT INTO notifications (id, company_id, user_id, type, title, content, metadata)
         VALUES ${values.map(() => '(?,?,?,?,?,?,?)').join(',')}`,
        values.flat()
    );

    res.status(201).json({ created: recipients.length });
}));

// =============================================================================
// GESTÃO DA PLATAFORMA
// =============================================================================
// Reservado a quem opera o serviço, não à administração de cada empresa.
// Antes, estas consultas corriam a partir do browser e liam a tabela de
// empresas e utilizadores por inteiro — sem qualquer verificação de que quem
// as fazia tinha esse direito.

systemRouter.get('/platform/stats', requireSuperAdmin, asyncHandler(async (_req, res) => {
    const [companies, users, revenue] = await Promise.all([
        queryOne('SELECT COUNT(*) AS count FROM companies'),
        queryOne('SELECT COUNT(*) AS count FROM users'),
        queryOne('SELECT COALESCE(SUM(total), 0) AS total FROM sales'),
    ]);

    res.json({
        companiesCount: Number(companies.count),
        usersCount: Number(users.count),
        totalRevenue: toNumber(revenue.total),
    });
}));

systemRouter.get('/platform/companies', requireSuperAdmin, asyncHandler(async (_req, res) => {
    const rows = await query(
        `SELECT c.id, c.name, c.nuit, c.email, c.contact, c.active, c.created_at,
                (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) AS user_count
           FROM companies c
          ORDER BY c.created_at DESC`
    );
    res.json(rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        nuit: row.nuit ?? '',
        email: row.email ?? '',
        contact: row.contact ?? '',
        active: row.active === 1,
        userCount: Number(row.user_count),
        createdAt: row.created_at,
    })));
}));

systemRouter.patch('/platform/companies/:id', requireSuperAdmin, asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) throw notFound('Empresa não encontrada.');

    const active = req.body?.active === true || req.body?.active === 'true';
    const result = await query('UPDATE companies SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
    if (result.affectedRows === 0) throw notFound('Empresa não encontrada.');

    res.json({ ok: true });
}));

/**
 * Cria uma empresa e o seu primeiro administrador.
 *
 * Antes, a criação de empresas era feita por um INSERT anónimo a partir do
 * ecrã de registo — a política da base de dados permitia-o explicitamente
 * (`FOR INSERT TO anon WITH CHECK (true)`). Passa a ser uma operação da
 * gestão da plataforma.
 */
systemRouter.post('/platform/companies', requireSuperAdmin, asyncHandler(async (req, res) => {
    const name = requireString(req.body?.name, 'nome da empresa');
    const adminName = requireString(req.body?.adminName, 'nome do administrador');
    const adminEmail = requireString(req.body?.adminEmail, 'e-mail do administrador', { max: 255 }).toLowerCase();

    const duplicate = await queryOne('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (duplicate) throw conflict('Já existe uma conta com este endereço de e-mail.');

    const result = await transaction(async (connection) => {
        const [inserted] = await connection.execute(
            'INSERT INTO companies (name, nuit, email, contact, active) VALUES (?,?,?,?,1)',
            [name,
             optionalString(req.body?.nuit, 'NUIT', { max: 32 }),
             optionalString(req.body?.email, 'e-mail da empresa', { max: 255 }),
             optionalString(req.body?.contact, 'contacto', { max: 64 })]
        );
        const companyId = inserted.insertId;
        const userId = newId();

        // Sem palavra-passe: a pessoa define-a pelo convite que recebe.
        await connection.execute(
            `INSERT INTO users (id, company_id, name, email, role, sequential_id, active)
             VALUES (?,?,?,?,'ADMIN',1,1)`,
            [userId, companyId, adminName, adminEmail]
        );

        await connection.execute(
            `INSERT INTO customers (id, company_id, name, address, type)
             VALUES (?, ?, 'Venda Directa', 'Balcão', 'NORMAL')`,
            [newId(), companyId]
        );

        return { companyId, userId };
    });

    await sendActivationInvite(result.userId);
    res.status(201).json({ id: Number(result.companyId), name });
}));

/**
 * Remove uma empresa e tudo o que lhe pertence.
 *
 * As chaves estrangeiras em cascata tratam da remoção dependente. Exige
 * confirmação explícita do nome, porque não há como desfazer.
 */
systemRouter.post('/platform/companies/:id/delete', requireSuperAdmin, asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) throw notFound('Empresa não encontrada.');

    const company = await queryOne('SELECT id, name FROM companies WHERE id = ?', [id]);
    if (!company) throw notFound('Empresa não encontrada.');

    if (req.body?.confirmName !== company.name) {
        throw badRequest('Para confirmar a remoção, escreva o nome exato da empresa.');
    }
    if (id === req.auth.companyId) {
        throw badRequest('Não é possível remover a empresa a que a sua própria conta pertence.');
    }

    await query('DELETE FROM companies WHERE id = ?', [id]);
    res.json({ ok: true });
}));

systemRouter.delete('/platform/users/:id', requireSuperAdmin, asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'utilizador');
    if (id === req.auth.userId) throw badRequest('Não pode remover a sua própria conta.');

    const result = await query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) throw notFound('Utilizador não encontrado.');
    res.json({ ok: true });
}));

systemRouter.get('/platform/users', requireSuperAdmin, asyncHandler(async (_req, res) => {
    const rows = await query(
        `SELECT u.id, u.name, u.email, u.role, u.active, u.last_login_at, u.created_at,
                c.name AS company_name, c.id AS company_id
           FROM users u
           JOIN companies c ON c.id = u.company_id
          ORDER BY u.created_at DESC
          LIMIT 1000`
    );
    res.json(rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        active: row.active === 1,
        lastLoginAt: row.last_login_at ?? undefined,
        company: { id: Number(row.company_id), name: row.company_name },
    })));
}));
