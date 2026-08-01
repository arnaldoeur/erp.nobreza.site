/**
 * Dados da empresa e gestão da equipa.
 *
 * É aqui que estavam as falhas de escalada de privilégios mais graves:
 *
 *  - `updateTeam()` recebia do browser o array completo de utilizadores e
 *    fazia `upsert`. Qualquer pessoa autenticada podia reescrever o perfil
 *    de um colega — incluindo promover-se a ADMIN.
 *
 *  - O login, ao não encontrar o perfil, criava um utilizador com
 *    `role: 'ADMIN'` ligado à primeira empresa da base de dados.
 *
 * Aqui, alterar perfis exige o papel de administrador, o `company_id` vem do
 * token, e ninguém pode alterar o seu próprio papel.
 */

import { Router } from 'express';
import { asyncHandler, badRequest, forbidden, notFound, conflict } from '../utils/errors.js';
import { query, queryOne, transaction } from '../db/pool.js';
import { newId } from '../utils/ids.js';
import { requireAuth, requireAdmin, requireRole } from '../middleware/auth.js';
import { logAction, notifyAdminsOfCriticalAction } from '../services/log.service.js';
import { sendActivationInvite, mapUser } from '../services/auth.service.js';
import {
    requireString, optionalString, requireEmail, optionalEmail, optionalMoney,
    requireUuid, requireEnum, optionalEnum, requireBoolean, toDateOnly,
    parseJson, toJson, toNumber, toBoolean,
} from '../utils/validate.js';

export const companyRouter = Router();
companyRouter.use(requireAuth);

const ROLES = ['ADMIN', 'COMMERCIAL', 'TECHNICIAN', 'ADMINISTRATIVE', 'PARTNER', 'HEALTH', 'OTHER'];

// =============================================================================
// EMPRESA
// =============================================================================

function mapCompany(row) {
    return {
        id: Number(row.id),
        name: row.name,
        slogan: row.slogan ?? '',
        nuit: row.nuit ?? '',
        address: row.address ?? '',
        email: row.email ?? '',
        phone: row.contact ?? '',
        phone2: row.contact_alt ?? undefined,
        website: row.website ?? '',
        logo: row.logo ?? undefined,
        logoHorizontal: row.logo_horizontal ?? undefined,
        logoVertical: row.logo_vertical ?? undefined,
        themeColor: row.theme_color,
        themeColorSecondary: row.theme_color_secondary,
        isDarkMode: toBoolean(row.is_dark_mode),
        language: row.language,
        timezone: row.timezone,
        closingTime: row.closing_time ?? undefined,
        workingHours: parseJson(row.working_hours, undefined),
        shifts: parseJson(row.shifts, []),
        paymentMethods: parseJson(row.payment_methods, []),
        emailDomain: row.email_domain ?? undefined,
    };
}

companyRouter.get('/company', asyncHandler(async (req, res) => {
    const row = await queryOne('SELECT * FROM companies WHERE id = ?', [req.auth.companyId]);
    if (!row) throw notFound('Empresa não encontrada.');
    res.json(mapCompany(row));
}));

/**
 * Atualiza os dados da empresa.
 *
 * Reservado a administradores: o nome, o NUIT e os logótipos aparecem nas
 * faturas, pelo que alterá-los é uma operação com efeito legal.
 */
companyRouter.put('/company', requireAdmin, asyncHandler(async (req, res) => {
    const body = req.body ?? {};

    await query(
        `UPDATE companies SET
            name = ?, slogan = ?, nuit = ?, address = ?, email = ?, contact = ?,
            contact_alt = ?, website = ?, logo = ?, logo_horizontal = ?, logo_vertical = ?,
            theme_color = ?, theme_color_secondary = ?, is_dark_mode = ?, language = ?,
            timezone = ?, closing_time = ?, working_hours = ?, shifts = ?,
            payment_methods = ?, email_domain = ?
         WHERE id = ?`,
        [
            requireString(body.name, 'nome da empresa'),
            optionalString(body.slogan, 'slogan'),
            optionalString(body.nuit, 'NUIT', { max: 32 }),
            optionalString(body.address, 'morada', { max: 500 }),
            optionalEmail(body.email),
            optionalString(body.phone, 'telefone', { max: 64 }),
            optionalString(body.phone2, 'telefone alternativo', { max: 64 }),
            optionalString(body.website, 'website'),
            optionalString(body.logo, 'logótipo', { max: 5_000_000 }),
            optionalString(body.logoHorizontal, 'logótipo horizontal', { max: 5_000_000 }),
            optionalString(body.logoVertical, 'logótipo vertical', { max: 5_000_000 }),
            optionalString(body.themeColor, 'cor principal', { max: 9 }) ?? '#10b981',
            optionalString(body.themeColorSecondary, 'cor secundária', { max: 9 }) ?? '#6366f1',
            requireBoolean(body.isDarkMode, false) ? 1 : 0,
            optionalEnum(body.language, 'idioma', ['pt-MZ', 'en-US'], 'pt-MZ'),
            optionalString(body.timezone, 'fuso horário', { max: 64 }) ?? 'Africa/Maputo',
            optionalString(body.closingTime, 'hora de fecho', { max: 5 }),
            toJson(body.workingHours ?? null),
            toJson(body.shifts ?? []),
            toJson(body.paymentMethods ?? []),
            optionalString(body.emailDomain, 'domínio de e-mail'),
            req.auth.companyId,
        ]
    );

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'COMPANY_UPDATE', details: 'Dados da empresa atualizados', ip: req.ip,
    });

    const row = await queryOne('SELECT * FROM companies WHERE id = ?', [req.auth.companyId]);
    res.json(mapCompany(row));
}));

// =============================================================================
// EQUIPA
// =============================================================================

const TEAM_COLUMNS = `
    id, company_id, name, email, role, is_super_admin, employee_id, sequential_id,
    responsibility, photo, contact, location, social_security_number,
    base_salary, base_hours, hire_date, active, last_login_at, created_at,
    (password_hash IS NOT NULL) AS has_password
`;

function mapTeamMember(row) {
    return { ...mapUser(row), hasPassword: row.has_password === 1 };
}

companyRouter.get('/team', asyncHandler(async (req, res) => {
    const rows = await query(
        `SELECT ${TEAM_COLUMNS} FROM users WHERE company_id = ? ORDER BY name`,
        [req.auth.companyId]
    );

    // Dados salariais só são visíveis a quem tem de os ver. Antes, `select('*')`
    // devolvia o salário de toda a gente a qualquer membro da equipa.
    const canSeePayroll = req.auth.isSuperAdmin || ['ADMIN', 'ADMINISTRATIVE'].includes(req.auth.role);

    res.json(rows.map((row) => {
        const member = mapTeamMember(row);
        if (!canSeePayroll && member.id !== req.auth.userId) {
            delete member.baseSalary;
            delete member.socialSecurityNumber;
        }
        return member;
    }));
}));

/**
 * Cria um membro da equipa.
 *
 * A conta nasce sem palavra-passe: a pessoa recebe um convite por e-mail e
 * define-a ela própria. Um administrador nunca escolhe a palavra-passe de
 * outra pessoa.
 */
companyRouter.post('/team', requireAdmin, asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const name = requireString(body.name, 'nome');
    const email = requireEmail(body.email);
    const role = requireEnum(body.role, 'perfil', ROLES);

    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) throw conflict('Já existe uma conta com este endereço de e-mail.');

    const id = newId();

    await transaction(async (connection) => {
        // O número sequencial é atribuído dentro da transação para não haver
        // dois membros com o mesmo número quando se criam contas em paralelo.
        const [maxRow] = await connection.execute(
            'SELECT COALESCE(MAX(sequential_id), 0) AS max_id FROM users WHERE company_id = ? FOR UPDATE',
            [req.auth.companyId]
        );
        const sequentialId = Number(maxRow[0].max_id) + 1;

        await connection.execute(
            `INSERT INTO users
                (id, company_id, name, email, role, sequential_id, employee_id, responsibility,
                 contact, location, social_security_number, base_salary, base_hours, hire_date, active)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [id, req.auth.companyId, name, email, role, sequentialId,
             optionalString(body.employeeId, 'número de funcionário', { max: 64 }),
             optionalString(body.responsibility, 'função', { max: 255 }),
             optionalString(body.contact, 'contacto', { max: 64 }),
             optionalString(body.location, 'localização', { max: 255 }),
             optionalString(body.socialSecurityNumber, 'número de segurança social', { max: 64 }),
             optionalMoney(body.baseSalary, 'salário base'),
             optionalMoney(body.baseHours, 'horas base') ?? '160.00',
             toDateOnly(body.hireDate, 'data de admissão'),
             requireBoolean(body.active, true) ? 1 : 0]
        );
    });

    await sendActivationInvite(id);
    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'TEAM_CREATE', details: `Membro criado: ${name} (${email}) como ${role}`, ip: req.ip,
    });

    const row = await queryOne(`SELECT ${TEAM_COLUMNS} FROM users WHERE id = ?`, [id]);
    res.status(201).json(mapTeamMember(row));
}));

/**
 * Atualiza um membro da equipa.
 *
 * Duas salvaguardas que não existiam:
 *  - ninguém pode alterar o seu próprio papel, o que impede que um
 *    administrador se despromova por engano e deixe a empresa sem gestão, e
 *    impede a auto-promoção se o papel vier a ser editável por mais perfis;
 *  - o último administrador ativo não pode ser desativado nem despromovido.
 */
companyRouter.put('/team/:id', requireAdmin, asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'utilizador');
    const body = req.body ?? {};

    const target = await queryOne(
        'SELECT id, role, active, email, name FROM users WHERE id = ? AND company_id = ?',
        [id, req.auth.companyId]
    );
    if (!target) throw notFound('Utilizador não encontrado.');

    const role = requireEnum(body.role, 'perfil', ROLES);
    const active = requireBoolean(body.active, true);

    if (id === req.auth.userId && role !== target.role) {
        throw forbidden('Não pode alterar o seu próprio perfil de acesso. Peça a outro administrador.');
    }

    const losesAdmin = target.role === 'ADMIN' && (role !== 'ADMIN' || !active);
    if (losesAdmin) {
        const remaining = await queryOne(
            "SELECT COUNT(*) AS count FROM users WHERE company_id = ? AND role = 'ADMIN' AND active = 1 AND id <> ?",
            [req.auth.companyId, id]
        );
        if (Number(remaining.count) === 0) {
            throw badRequest('Esta é a única conta de administrador ativa. Promova outra pessoa antes de a alterar.');
        }
    }

    await query(
        `UPDATE users SET
            name = ?, email = ?, role = ?, employee_id = ?, responsibility = ?,
            contact = ?, location = ?, social_security_number = ?,
            base_salary = ?, base_hours = ?, hire_date = ?, active = ?
         WHERE id = ? AND company_id = ?`,
        [requireString(body.name, 'nome'),
         requireEmail(body.email),
         role,
         optionalString(body.employeeId, 'número de funcionário', { max: 64 }),
         optionalString(body.responsibility, 'função', { max: 255 }),
         optionalString(body.contact, 'contacto', { max: 64 }),
         optionalString(body.location, 'localização', { max: 255 }),
         optionalString(body.socialSecurityNumber, 'número de segurança social', { max: 64 }),
         optionalMoney(body.baseSalary, 'salário base'),
         optionalMoney(body.baseHours, 'horas base') ?? '160.00',
         toDateOnly(body.hireDate, 'data de admissão'),
         active ? 1 : 0,
         id, req.auth.companyId]
    );

    if (role !== target.role) {
        await logAction({
            companyId: req.auth.companyId, userId: req.auth.userId,
            action: 'ROLE_CHANGE', details: `${target.name}: ${target.role} -> ${role}`, ip: req.ip,
        });
        await notifyAdminsOfCriticalAction({
            companyId: req.auth.companyId, action: 'ROLE_CHANGE',
            details: `${target.name} passou de ${target.role} para ${role}`,
            actorId: req.auth.userId,
        });
    }

    const row = await queryOne(`SELECT ${TEAM_COLUMNS} FROM users WHERE id = ?`, [id]);
    res.json(mapTeamMember(row));
}));

/**
 * Próximo número de funcionário disponível.
 *
 * Substitui o RPC `get_next_employee_id`. É indicativo: o número definitivo
 * é atribuído dentro da transação de criação, para que dois formulários
 * abertos em simultâneo não fiquem ambos com o mesmo.
 */
companyRouter.get('/team/next-employee-id', requireAdmin, asyncHandler(async (req, res) => {
    const row = await queryOne(
        'SELECT COALESCE(MAX(sequential_id), 0) + 1 AS next_id FROM users WHERE company_id = ?',
        [req.auth.companyId]
    );
    res.json({ nextId: Number(row.next_id) });
}));

/**
 * Exportação dos dados da empresa, para cópia de segurança local.
 *
 * A versão anterior fazia `select('*')` a seis tabelas a partir do browser,
 * sem qualquer verificação de permissão. Aqui é uma operação de
 * administrador, limitada à empresa da sessão, e sem colunas sensíveis:
 * hashes de palavra-passe e credenciais de e-mail nunca saem do servidor.
 */
companyRouter.get('/company/backup', requireAdmin, asyncHandler(async (req, res) => {
    const companyId = req.auth.companyId;

    const [company, users, products, customers, suppliers, sales, saleItems, expenses] = await Promise.all([
        queryOne('SELECT * FROM companies WHERE id = ?', [companyId]),
        query(`SELECT id, name, email, role, employee_id, sequential_id, responsibility,
                      contact, location, base_salary, base_hours, hire_date, active, created_at
                 FROM users WHERE company_id = ?`, [companyId]),
        query('SELECT * FROM products WHERE company_id = ?', [companyId]),
        query('SELECT * FROM customers WHERE company_id = ?', [companyId]),
        query('SELECT * FROM suppliers WHERE company_id = ?', [companyId]),
        query('SELECT * FROM sales WHERE company_id = ?', [companyId]),
        query('SELECT * FROM sale_items WHERE company_id = ?', [companyId]),
        query('SELECT * FROM expenses WHERE company_id = ?', [companyId]),
    ]);

    await logAction({
        companyId, userId: req.auth.userId,
        action: 'DATA_EXPORT', details: 'Cópia de segurança dos dados exportada', ip: req.ip,
    });

    res.json({
        exportedAt: new Date().toISOString(),
        company,
        users,
        products,
        customers,
        suppliers,
        sales,
        sale_items: saleItems,
        expenses,
    });
}));

/** Reenvia o convite de ativação a quem ainda não definiu palavra-passe. */
companyRouter.post('/team/:id/invite', requireAdmin, asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'utilizador');
    const target = await queryOne('SELECT id FROM users WHERE id = ? AND company_id = ?', [id, req.auth.companyId]);
    if (!target) throw notFound('Utilizador não encontrado.');

    const sent = await sendActivationInvite(id);
    res.json({ ok: true, sent });
}));

companyRouter.delete('/team/:id', requireAdmin, asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'utilizador');
    if (id === req.auth.userId) throw forbidden('Não pode remover a sua própria conta.');

    const target = await queryOne(
        'SELECT id, name, role FROM users WHERE id = ? AND company_id = ?',
        [id, req.auth.companyId]
    );
    if (!target) throw notFound('Utilizador não encontrado.');

    if (target.role === 'ADMIN') {
        const remaining = await queryOne(
            "SELECT COUNT(*) AS count FROM users WHERE company_id = ? AND role = 'ADMIN' AND active = 1 AND id <> ?",
            [req.auth.companyId, id]
        );
        if (Number(remaining.count) === 0) {
            throw badRequest('Não é possível remover a única conta de administrador ativa.');
        }
    }

    await query('DELETE FROM users WHERE id = ? AND company_id = ?', [id, req.auth.companyId]);

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'TEAM_DELETE', details: `Membro removido: ${target.name}`, ip: req.ip,
    });
    await notifyAdminsOfCriticalAction({
        companyId: req.auth.companyId, action: 'TEAM_DELETE',
        details: `${target.name} foi removido da equipa`, actorId: req.auth.userId,
    });

    res.json({ ok: true });
}));

/**
 * Atualiza o próprio perfil.
 *
 * Deliberadamente separado de `/team/:id`: aqui não há papel, nem salário,
 * nem estado ativo. Quem edita o seu perfil só mexe nos seus dados pessoais.
 */
companyRouter.put('/profile', asyncHandler(async (req, res) => {
    const body = req.body ?? {};

    await query(
        `UPDATE users SET name = ?, contact = ?, location = ?, photo = ? WHERE id = ?`,
        [requireString(body.name, 'nome'),
         optionalString(body.contact, 'contacto', { max: 64 }),
         optionalString(body.location, 'localização', { max: 255 }),
         optionalString(body.photo, 'fotografia', { max: 5_000_000 }),
         req.auth.userId]
    );

    const row = await queryOne(`SELECT ${TEAM_COLUMNS} FROM users WHERE id = ?`, [req.auth.userId]);
    res.json(mapTeamMember(row));
}));

// =============================================================================
// TURNOS DE TRABALHO
// =============================================================================

function mapShift(row) {
    return {
        id: row.id,
        user_id: row.user_id,
        start_time: row.start_time,
        end_time: row.end_time ?? undefined,
        status: row.status,
        notes: row.notes ?? undefined,
    };
}

companyRouter.get('/shifts/current', asyncHandler(async (req, res) => {
    const row = await queryOne(
        "SELECT * FROM work_shifts WHERE user_id = ? AND status = 'OPEN' ORDER BY start_time DESC LIMIT 1",
        [req.auth.userId]
    );
    res.json(row ? mapShift(row) : null);
}));

/**
 * Entrada ao serviço.
 *
 * Se já existir um turno aberto devolve-o em vez de abrir outro — o cliente
 * não consegue acumular turnos abertos carregando duas vezes no botão.
 */
companyRouter.post('/shifts/check-in', asyncHandler(async (req, res) => {
    const shift = await transaction(async (connection) => {
        const [open] = await connection.execute(
            "SELECT * FROM work_shifts WHERE user_id = ? AND status = 'OPEN' ORDER BY start_time DESC LIMIT 1 FOR UPDATE",
            [req.auth.userId]
        );
        if (open.length > 0) return open[0];

        const id = newId();
        await connection.execute(
            "INSERT INTO work_shifts (id, company_id, user_id, status) VALUES (?,?,?,'OPEN')",
            [id, req.auth.companyId, req.auth.userId]
        );
        const [rows] = await connection.execute('SELECT * FROM work_shifts WHERE id = ?', [id]);
        return rows[0];
    });

    res.json(mapShift(shift));
}));

companyRouter.post('/shifts/:id/check-out', asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'turno');
    const notes = optionalString(req.body?.notes, 'notas', { max: 5000 });

    // A condição inclui `user_id`: ninguém fecha o turno de outra pessoa.
    const result = await query(
        `UPDATE work_shifts SET end_time = UTC_TIMESTAMP(3), status = 'CLOSED', notes = ?
          WHERE id = ? AND user_id = ? AND status = 'OPEN'`,
        [notes, id, req.auth.userId]
    );
    if (result.affectedRows === 0) throw notFound('Turno não encontrado ou já encerrado.');

    const row = await queryOne('SELECT * FROM work_shifts WHERE id = ?', [id]);
    res.json(mapShift(row));
}));

companyRouter.get('/shifts', asyncHandler(async (req, res) => {
    const conditions = ['company_id = ?'];
    const params = [req.auth.companyId];

    // Só a administração vê os turnos de terceiros.
    const canSeeAll = req.auth.isSuperAdmin || ['ADMIN', 'ADMINISTRATIVE'].includes(req.auth.role);
    const requestedUserId = req.query.userId ? requireUuid(req.query.userId, 'utilizador') : null;

    if (!canSeeAll) {
        conditions.push('user_id = ?');
        params.push(req.auth.userId);
    } else if (requestedUserId) {
        conditions.push('user_id = ?');
        params.push(requestedUserId);
    }

    if (req.query.startDate) {
        conditions.push('start_time >= ?');
        params.push(new Date(`${req.query.startDate}T00:00:00.000Z`));
    }
    if (req.query.endDate) {
        conditions.push('start_time <= ?');
        params.push(new Date(`${req.query.endDate}T23:59:59.999Z`));
    }

    const rows = await query(
        `SELECT * FROM work_shifts WHERE ${conditions.join(' AND ')} ORDER BY start_time DESC LIMIT 500`,
        params
    );
    res.json(rows.map(mapShift));
}));
