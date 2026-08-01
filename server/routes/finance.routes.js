/**
 * Despesas, fechos de caixa, planos de saúde e relatórios.
 */

import { Router } from 'express';
import { asyncHandler, notFound } from '../utils/errors.js';
import { query, queryOne } from '../db/pool.js';
import { newId } from '../utils/ids.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { logAction } from '../services/log.service.js';
import {
    requireString, optionalString, optionalEmail, requireMoney, optionalMoney,
    requireUuid, requireEnum, optionalEnum, requireDate, toDateOnly,
    toNumber, toBoolean, parseJson, toJson, requireBoolean, pagination,
} from '../utils/validate.js';

export const financeRouter = Router();
financeRouter.use(requireAuth);

// Quem pode ver e mexer em dinheiro. Na versão anterior isto era decidido
// apenas pela interface, que escondia separadores mas não impedia nada.
const FINANCE_ROLES = ['ADMIN', 'ADMINISTRATIVE', 'PARTNER'];

// =============================================================================
// DESPESAS
// =============================================================================

const EXPENSE_TYPES = ['Operational', 'Salary', 'Maintenance', 'Technical', 'Tax', 'Other'];

function mapExpense(row) {
    return {
        id: row.id,
        companyId: String(row.company_id),
        userId: row.user_id ?? '',
        type: row.type,
        amount: toNumber(row.amount),
        description: row.description,
        date: row.date,
        createdAt: row.created_at,
    };
}

financeRouter.get('/expenses', requireRole(...FINANCE_ROLES), asyncHandler(async (req, res) => {
    const rows = await query(
        'SELECT * FROM expenses WHERE company_id = ? ORDER BY date DESC, created_at DESC',
        [req.auth.companyId]
    );
    res.json(rows.map(mapExpense));
}));

financeRouter.post('/expenses', requireRole(...FINANCE_ROLES), asyncHandler(async (req, res) => {
    const description = requireString(req.body?.description, 'descrição', { max: 500 });
    const amount = requireMoney(req.body?.amount, 'valor', { min: 0 });
    const type = optionalEnum(req.body?.type, 'tipo', EXPENSE_TYPES, 'Operational');
    const date = toDateOnly(req.body?.date, 'data') ?? new Date().toISOString().slice(0, 10);

    const id = newId();
    await query(
        'INSERT INTO expenses (id, company_id, user_id, description, amount, type, date) VALUES (?,?,?,?,?,?,?)',
        [id, req.auth.companyId, req.auth.userId, description, amount, type, date]
    );

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'EXPENSE_CREATE', details: `${description} — ${amount} MT`, ip: req.ip,
    });

    const row = await queryOne('SELECT * FROM expenses WHERE id = ?', [id]);
    res.status(201).json(mapExpense(row));
}));

financeRouter.put('/expenses/:id', requireRole(...FINANCE_ROLES), asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'despesa');
    const description = requireString(req.body?.description, 'descrição', { max: 500 });
    const amount = requireMoney(req.body?.amount, 'valor', { min: 0 });
    const type = optionalEnum(req.body?.type, 'tipo', EXPENSE_TYPES, 'Operational');

    const result = await query(
        'UPDATE expenses SET description = ?, amount = ?, type = ? WHERE id = ? AND company_id = ?',
        [description, amount, type, id, req.auth.companyId]
    );
    if (result.affectedRows === 0) throw notFound('Despesa não encontrada.');

    const row = await queryOne('SELECT * FROM expenses WHERE id = ?', [id]);
    res.json(mapExpense(row));
}));

financeRouter.delete('/expenses/:id', requireRole('ADMIN', 'ADMINISTRATIVE'), asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'despesa');
    const result = await query('DELETE FROM expenses WHERE id = ? AND company_id = ?', [id, req.auth.companyId]);
    if (result.affectedRows === 0) throw notFound('Despesa não encontrada.');

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'EXPENSE_DELETE', details: `Despesa ${id} eliminada`, ip: req.ip,
    });
    res.json({ ok: true });
}));

// =============================================================================
// FECHOS DE CAIXA
// =============================================================================

function mapClosure(row) {
    return {
        id: row.id,
        companyId: Number(row.company_id),
        closureDate: row.closure_date,
        shift: row.shift ?? '',
        responsibleId: row.responsible_id ?? '',
        responsibleName: row.responsible_name ?? '',
        systemTotal: toNumber(row.system_total),
        manualCash: toNumber(row.manual_cash),
        difference: toNumber(row.difference),
        observations: row.observations ?? '',
        status: row.status,
        createdAt: row.created_at,
    };
}

financeRouter.get('/closures', asyncHandler(async (req, res) => {
    const rows = await query(
        'SELECT * FROM daily_closures WHERE company_id = ? ORDER BY closure_date DESC',
        [req.auth.companyId]
    );
    res.json(rows.map(mapClosure));
}));

/**
 * Regista um fecho de caixa.
 *
 * A diferença é recalculada no servidor a partir do total do sistema e do
 * numerário contado. Antes vinha calculada do cliente, o que permitia
 * gravar um fecho "certo" com valores que não batiam.
 */
financeRouter.post('/closures', asyncHandler(async (req, res) => {
    const closureDate = requireDate(req.body?.closureDate ?? new Date(), 'data do fecho');
    const shift = optionalString(req.body?.shift, 'turno', { max: 64 });
    const systemTotal = requireMoney(req.body?.systemTotal, 'total do sistema');
    const manualCash = requireMoney(req.body?.manualCash, 'numerário contado');
    const observations = optionalString(req.body?.observations, 'observações', { max: 5000 });
    const status = optionalEnum(req.body?.status, 'estado', ['CLOSED', 'REOPENED', 'AUDITED'], 'CLOSED');

    const difference = (Number(manualCash) - Number(systemTotal)).toFixed(2);

    const id = newId();
    await query(
        `INSERT INTO daily_closures
            (id, company_id, closure_date, shift, responsible_id, responsible_name,
             system_total, manual_cash, difference, observations, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [id, req.auth.companyId, closureDate, shift, req.auth.userId,
         optionalString(req.body?.responsibleName, 'responsável', { max: 255 }),
         systemTotal, manualCash, difference, observations, status]
    );

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'CLOSURE_CREATE',
        details: `Fecho de ${closureDate.toISOString().slice(0, 10)} — diferença ${difference} MT`,
        ip: req.ip,
    });

    const row = await queryOne('SELECT * FROM daily_closures WHERE id = ?', [id]);
    res.status(201).json(mapClosure(row));
}));

// =============================================================================
// PLANOS DE SAÚDE
// =============================================================================

function mapHealthPlan(row) {
    return {
        id: row.id,
        companyId: Number(row.company_id),
        name: row.name,
        insurer: row.insurer ?? '',
        coveragePercentage: toNumber(row.coverage_percentage),
        contact: row.contact ?? undefined,
        email: row.email ?? undefined,
        website: row.website ?? undefined,
        description: row.description ?? undefined,
        coverageDetails: row.coverage_details ?? undefined,
        active: toBoolean(row.active),
    };
}

function readHealthPlanBody(body) {
    return {
        name: requireString(body?.name, 'nome'),
        insurer: optionalString(body?.insurer, 'seguradora', { max: 255 }),
        coveragePercentage: optionalMoney(body?.coveragePercentage, 'percentagem de cobertura', { min: 0, max: 100 }),
        contact: optionalString(body?.contact, 'contacto', { max: 64 }),
        email: optionalEmail(body?.email),
        website: optionalString(body?.website, 'website', { max: 255 }),
        description: optionalString(body?.description, 'descrição', { max: 5000 }),
        coverageDetails: optionalString(body?.coverageDetails, 'detalhes de cobertura', { max: 5000 }),
        active: requireBoolean(body?.active, true),
    };
}

financeRouter.get('/health-plans', asyncHandler(async (req, res) => {
    const rows = await query(
        'SELECT * FROM health_plans WHERE company_id = ? AND active = 1 ORDER BY name',
        [req.auth.companyId]
    );
    res.json(rows.map(mapHealthPlan));
}));

financeRouter.post('/health-plans', requireRole('ADMIN', 'HEALTH', 'ADMINISTRATIVE'), asyncHandler(async (req, res) => {
    const data = readHealthPlanBody(req.body);
    const id = newId();

    await query(
        `INSERT INTO health_plans
            (id, company_id, name, insurer, coverage_percentage, contact, email, website, description, coverage_details, active)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [id, req.auth.companyId, data.name, data.insurer, data.coveragePercentage, data.contact,
         data.email, data.website, data.description, data.coverageDetails, data.active ? 1 : 0]
    );

    const row = await queryOne('SELECT * FROM health_plans WHERE id = ?', [id]);
    res.status(201).json(mapHealthPlan(row));
}));

financeRouter.put('/health-plans/:id', requireRole('ADMIN', 'HEALTH', 'ADMINISTRATIVE'), asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'plano de saúde');
    const data = readHealthPlanBody(req.body);

    const result = await query(
        `UPDATE health_plans SET
            name = ?, insurer = ?, coverage_percentage = ?, contact = ?, email = ?,
            website = ?, description = ?, coverage_details = ?, active = ?
         WHERE id = ? AND company_id = ?`,
        [data.name, data.insurer, data.coveragePercentage, data.contact, data.email,
         data.website, data.description, data.coverageDetails, data.active ? 1 : 0,
         id, req.auth.companyId]
    );
    if (result.affectedRows === 0) throw notFound('Plano de saúde não encontrado.');

    const row = await queryOne('SELECT * FROM health_plans WHERE id = ?', [id]);
    res.json(mapHealthPlan(row));
}));

/** Remoção lógica: o plano deixa de aparecer mas o histórico mantém-se coerente. */
financeRouter.delete('/health-plans/:id', requireRole('ADMIN', 'HEALTH'), asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'plano de saúde');
    const result = await query(
        'UPDATE health_plans SET active = 0 WHERE id = ? AND company_id = ?',
        [id, req.auth.companyId]
    );
    if (result.affectedRows === 0) throw notFound('Plano de saúde não encontrado.');
    res.json({ ok: true });
}));

// =============================================================================
// RELATÓRIOS GUARDADOS
// =============================================================================

financeRouter.get('/reports', requireRole(...FINANCE_ROLES), asyncHandler(async (req, res) => {
    const { limit, offset } = pagination(req.query, { defaultLimit: 50, maxLimit: 200 });
    const rows = await query(
        `SELECT r.*, u.name AS user_name FROM reports r
           LEFT JOIN users u ON u.id = r.user_id
          WHERE r.company_id = ?
          ORDER BY r.created_at DESC
          LIMIT ${limit} OFFSET ${offset}`,
        [req.auth.companyId]
    );
    res.json(rows.map((row) => ({
        id: row.id,
        type: row.type,
        period: row.period,
        summary: row.summary ?? '',
        data: parseJson(row.data, null),
        metadata: parseJson(row.metadata, null),
        createdBy: row.user_name ?? 'Sistema',
        createdAt: row.created_at,
    })));
}));

financeRouter.post('/reports', requireRole(...FINANCE_ROLES), asyncHandler(async (req, res) => {
    const type = requireString(req.body?.type, 'tipo', { max: 64 });
    const period = requireString(req.body?.period, 'período', { max: 32 });
    const summary = optionalString(req.body?.summary, 'resumo', { max: 5000 });

    const id = newId();
    await query(
        'INSERT INTO reports (id, company_id, user_id, type, period, summary, data, metadata) VALUES (?,?,?,?,?,?,?,?)',
        [id, req.auth.companyId, req.auth.userId, type, period, summary,
         toJson(req.body?.data ?? null), toJson(req.body?.metadata ?? null)]
    );

    res.status(201).json({ id });
}));

// =============================================================================
// INDICADORES DO PAINEL
// =============================================================================

/**
 * Resumo agregado para o painel principal.
 *
 * Estes números eram calculados no browser, o que obrigava a transferir o
 * histórico completo de vendas para somar valores. Aqui a agregação acontece
 * na base de dados e o que viaja é o resultado.
 */
financeRouter.get('/dashboard/summary', asyncHandler(async (req, res) => {
    const companyId = req.auth.companyId;

    const [todaySales, monthSales, monthExpenses, lowStock, hourly] = await Promise.all([
        queryOne(
            `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
               FROM sales WHERE company_id = ? AND created_at >= UTC_DATE()`,
            [companyId]
        ),
        queryOne(
            `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
               FROM sales WHERE company_id = ? AND created_at >= DATE_FORMAT(UTC_DATE(), '%Y-%m-01')`,
            [companyId]
        ),
        queryOne(
            `SELECT COALESCE(SUM(amount), 0) AS total
               FROM expenses WHERE company_id = ? AND date >= DATE_FORMAT(UTC_DATE(), '%Y-%m-01')`,
            [companyId]
        ),
        queryOne(
            'SELECT COUNT(*) AS count FROM products WHERE company_id = ? AND quantity <= min_stock',
            [companyId]
        ),
        // Vendas por hora nas últimas 24 horas, para o gráfico do painel.
        query(
            `SELECT HOUR(created_at) AS hour, COALESCE(SUM(total), 0) AS total, COUNT(*) AS count
               FROM sales
              WHERE company_id = ? AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)
              GROUP BY HOUR(created_at)
              ORDER BY hour`,
            [companyId]
        ),
    ]);

    res.json({
        today: { total: toNumber(todaySales.total), count: Number(todaySales.count) },
        month: {
            revenue: toNumber(monthSales.total),
            salesCount: Number(monthSales.count),
            expenses: toNumber(monthExpenses.total),
            balance: toNumber(monthSales.total) - toNumber(monthExpenses.total),
        },
        lowStockCount: Number(lowStock.count),
        hourly: hourly.map((row) => ({ hour: row.hour, total: toNumber(row.total), count: Number(row.count) })),
    });
}));
