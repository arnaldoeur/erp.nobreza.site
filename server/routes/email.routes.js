/**
 * Módulo de e-mail: contas configuradas, pastas, mensagens e envio.
 *
 * Duas correções centrais em relação ao que existia:
 *
 *  1. As palavras-passe SMTP e IMAP eram guardadas em texto simples e
 *     devolvidas ao browser num `select('*')`. Passam a ser cifradas e a
 *     nunca sair do servidor — nem sequer para o administrador.
 *
 *  2. O envio passava por uma Edge Function sem autenticação e com CORS
 *     aberto, que aceitava remetente, destinatário e corpo livres. Era um
 *     relay aberto: qualquer pessoa na internet enviava e-mail em nome do
 *     domínio da empresa. Agora o remetente é fixo no servidor e só quem tem
 *     sessão consegue enviar.
 */

import { Router } from 'express';
import { createLimiter } from '../middleware/rate-limit.js';
import { asyncHandler, badRequest, forbidden, notFound } from '../utils/errors.js';
import { query, queryOne } from '../db/pool.js';
import { newId } from '../utils/ids.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { sendMail, verifySmtpAccount } from '../services/mail.service.js';
import { logAction } from '../services/log.service.js';
import {
    requireString, optionalString, requireEmail, optionalEmail, requireUuid,
    optionalInt, requireEnum, optionalEnum, requireBoolean, parseJson, toJson, pagination,
} from '../utils/validate.js';

export const emailRouter = Router();
emailRouter.use(requireAuth);

/**
 * Campos devolvidos de uma conta de e-mail.
 *
 * As colunas `*_pass_encrypted` estão deliberadamente ausentes desta lista.
 * Não há nenhuma rota que as devolva: a aplicação usa-as internamente para
 * ligar ao servidor de correio, e nada mais.
 */
const ACCOUNT_COLUMNS = `
    id, company_id, user_id, account_type, display_name, email,
    smtp_host, smtp_port, smtp_user, smtp_secure,
    imap_host, imap_port, imap_user, imap_secure,
    is_active, created_at,
    (smtp_pass_encrypted IS NOT NULL) AS has_smtp_password,
    (imap_pass_encrypted IS NOT NULL) AS has_imap_password
`;

function mapAccount(row) {
    return {
        id: row.id,
        company_id: String(row.company_id),
        user_id: row.user_id ?? undefined,
        account_type: row.account_type,
        display_name: row.display_name,
        email: row.email,
        smtp_host: row.smtp_host ?? '',
        smtp_port: row.smtp_port ?? 465,
        smtp_user: row.smtp_user ?? '',
        smtp_secure: row.smtp_secure === 1,
        imap_host: row.imap_host ?? '',
        imap_port: row.imap_port ?? 993,
        imap_user: row.imap_user ?? '',
        imap_secure: row.imap_secure === 1,
        is_active: row.is_active === 1,
        // Indicadores em vez dos valores: a interface consegue mostrar
        // "configurada" sem nunca receber a palavra-passe.
        has_smtp_password: row.has_smtp_password === 1,
        has_imap_password: row.has_imap_password === 1,
        created_at: row.created_at,
    };
}

/**
 * Contas visíveis ao utilizador: as partilhadas da empresa e a sua pessoal.
 */
emailRouter.get('/email/accounts', asyncHandler(async (req, res) => {
    const rows = await query(
        `SELECT ${ACCOUNT_COLUMNS} FROM erp_email_accounts
          WHERE company_id = ? AND (account_type <> 'PERSONAL' OR user_id = ?)
          ORDER BY account_type, display_name`,
        [req.auth.companyId, req.auth.userId]
    );
    res.json(rows.map(mapAccount));
}));

/**
 * Cria ou atualiza uma conta de e-mail.
 *
 * As palavras-passe só são gravadas quando vêm preenchidas: guardar o
 * indicador em vez do valor significa que a interface não as pode reenviar,
 * e um campo vazio tem de significar "não mexer", não "apagar".
 */
emailRouter.post('/email/accounts', requireAdmin, asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const id = body.id ? requireUuid(body.id, 'conta') : null;

    const data = {
        accountType: requireEnum(body.account_type, 'tipo de conta', ['COMPANY', 'TEAM', 'PERSONAL', 'SYSTEM']),
        displayName: requireString(body.display_name, 'nome de apresentação'),
        email: requireEmail(body.email),
        smtpHost: optionalString(body.smtp_host, 'servidor SMTP'),
        smtpPort: optionalInt(body.smtp_port, 'porta SMTP', { min: 1, max: 65535 }) ?? 465,
        smtpUser: optionalString(body.smtp_user, 'utilizador SMTP'),
        smtpSecure: requireBoolean(body.smtp_secure, true),
        imapHost: optionalString(body.imap_host, 'servidor IMAP'),
        imapPort: optionalInt(body.imap_port, 'porta IMAP', { min: 1, max: 65535 }) ?? 993,
        imapUser: optionalString(body.imap_user, 'utilizador IMAP'),
        imapSecure: requireBoolean(body.imap_secure, true),
        isActive: requireBoolean(body.is_active, true),
    };

    const smtpPassword = optionalString(body.smtp_pass, 'palavra-passe SMTP', { max: 500 });
    const imapPassword = optionalString(body.imap_pass, 'palavra-passe IMAP', { max: 500 });

    if (id) {
        const existing = await queryOne(
            'SELECT id FROM erp_email_accounts WHERE id = ? AND company_id = ?',
            [id, req.auth.companyId]
        );
        if (!existing) throw notFound('Conta de e-mail não encontrada.');

        await query(
            `UPDATE erp_email_accounts SET
                account_type = ?, display_name = ?, email = ?,
                smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_secure = ?,
                imap_host = ?, imap_port = ?, imap_user = ?, imap_secure = ?, is_active = ?
                ${smtpPassword ? ', smtp_pass_encrypted = ?' : ''}
                ${imapPassword ? ', imap_pass_encrypted = ?' : ''}
              WHERE id = ? AND company_id = ?`,
            [data.accountType, data.displayName, data.email,
             data.smtpHost, data.smtpPort, data.smtpUser, data.smtpSecure ? 1 : 0,
             data.imapHost, data.imapPort, data.imapUser, data.imapSecure ? 1 : 0,
             data.isActive ? 1 : 0,
             ...(smtpPassword ? [encrypt(smtpPassword)] : []),
             ...(imapPassword ? [encrypt(imapPassword)] : []),
             id, req.auth.companyId]
        );

        const row = await queryOne(`SELECT ${ACCOUNT_COLUMNS} FROM erp_email_accounts WHERE id = ?`, [id]);
        return res.json(mapAccount(row));
    }

    const newAccountId = newId();
    await query(
        `INSERT INTO erp_email_accounts
            (id, company_id, user_id, account_type, display_name, email,
             smtp_host, smtp_port, smtp_user, smtp_pass_encrypted, smtp_secure,
             imap_host, imap_port, imap_user, imap_pass_encrypted, imap_secure, is_active)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [newAccountId, req.auth.companyId,
         data.accountType === 'PERSONAL' ? req.auth.userId : null,
         data.accountType, data.displayName, data.email,
         data.smtpHost, data.smtpPort, data.smtpUser, encrypt(smtpPassword), data.smtpSecure ? 1 : 0,
         data.imapHost, data.imapPort, data.imapUser, encrypt(imapPassword), data.imapSecure ? 1 : 0,
         data.isActive ? 1 : 0]
    );

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'EMAIL_ACCOUNT_CREATE', details: `Conta de e-mail criada: ${data.email}`, ip: req.ip,
    });

    const row = await queryOne(`SELECT ${ACCOUNT_COLUMNS} FROM erp_email_accounts WHERE id = ?`, [newAccountId]);
    res.status(201).json(mapAccount(row));
}));

/**
 * Testa a ligação SMTP de uma conta configurada.
 *
 * O teste corre no servidor, com a credencial decifrada em memória. Antes
 * esta operação não existia de facto — devolvia sempre sucesso.
 */
emailRouter.post('/email/accounts/:id/test', requireAdmin, asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'conta');

    const account = await queryOne(
        `SELECT smtp_host, smtp_port, smtp_user, smtp_pass_encrypted, smtp_secure
           FROM erp_email_accounts WHERE id = ? AND company_id = ?`,
        [id, req.auth.companyId]
    );
    if (!account) throw notFound('Conta de e-mail não encontrada.');
    if (!account.smtp_host) throw badRequest('Esta conta não tem servidor SMTP configurado.');

    const result = await verifySmtpAccount({
        host: account.smtp_host,
        port: account.smtp_port,
        secure: account.smtp_secure === 1,
        user: account.smtp_user,
        password: decrypt(account.smtp_pass_encrypted),
    });

    res.json(result);
}));

emailRouter.delete('/email/accounts/:id', requireAdmin, asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'conta');
    const result = await query(
        'DELETE FROM erp_email_accounts WHERE id = ? AND company_id = ?',
        [id, req.auth.companyId]
    );
    if (result.affectedRows === 0) throw notFound('Conta de e-mail não encontrada.');
    res.json({ ok: true });
}));

// =============================================================================
// PASTAS E MENSAGENS
// =============================================================================

/** Confirma que a conta pertence à empresa da sessão, e ao utilizador se for pessoal. */
async function assertAccountAccess(accountId, auth) {
    const account = await queryOne(
        'SELECT id, account_type, user_id FROM erp_email_accounts WHERE id = ? AND company_id = ?',
        [accountId, auth.companyId]
    );
    if (!account) throw notFound('Conta de e-mail não encontrada.');
    if (account.account_type === 'PERSONAL' && account.user_id !== auth.userId) {
        throw forbidden('Esta é a caixa de correio pessoal de outro utilizador.');
    }
    return account;
}

emailRouter.get('/email/accounts/:id/folders', asyncHandler(async (req, res) => {
    const accountId = requireUuid(req.params.id, 'conta');
    await assertAccountAccess(accountId, req.auth);

    const rows = await query('SELECT * FROM erp_email_folders WHERE account_id = ? ORDER BY name', [accountId]);
    res.json(rows.map((row) => ({
        id: row.id,
        account_id: row.account_id,
        name: row.name,
        path: row.path,
        type: row.type,
        total_count: row.total_count,
        unseen_count: row.unseen_count,
        last_sync: row.last_sync ?? undefined,
    })));
}));

emailRouter.get('/email/folders/:id/messages', asyncHandler(async (req, res) => {
    const folderId = requireUuid(req.params.id, 'pasta');

    // A verificação de acesso é feita pela conta a que a pasta pertence.
    const folder = await queryOne(
        `SELECT f.id, f.account_id FROM erp_email_folders f
           JOIN erp_email_accounts a ON a.id = f.account_id
          WHERE f.id = ? AND a.company_id = ?`,
        [folderId, req.auth.companyId]
    );
    if (!folder) throw notFound('Pasta não encontrada.');
    await assertAccountAccess(folder.account_id, req.auth);

    const { limit, offset } = pagination(req.query, { defaultLimit: 20, maxLimit: 100 });

    const [rows, total] = await Promise.all([
        query(
            `SELECT * FROM erp_emails_metadata WHERE folder_id = ?
              ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`,
            [folderId]
        ),
        queryOne('SELECT COUNT(*) AS count FROM erp_emails_metadata WHERE folder_id = ?', [folderId]),
    ]);

    res.json({
        data: rows.map((row) => ({
            id: row.id,
            account_id: row.account_id,
            folder_id: row.folder_id,
            uid: row.uid,
            message_id: row.message_id ?? undefined,
            subject: row.subject ?? '(sem assunto)',
            from_addr: row.from_addr ?? '',
            from_name: row.from_name ?? '',
            to_addr: parseJson(row.to_addr, []),
            date: row.date,
            flags: parseJson(row.flags, []),
            has_attachments: row.has_attachments === 1,
            snippet: row.snippet ?? '',
        })),
        count: Number(total.count),
    });
}));

// =============================================================================
// ENVIO
// =============================================================================

const sendLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 100,
    message: 'Limite de envio atingido nesta hora. Tente mais tarde.',
});

/**
 * Envia uma mensagem.
 *
 * O remetente não é aceite do cliente — é sempre o MAIL_FROM_ADDRESS do
 * servidor. É essa a diferença entre um serviço de envio e um relay aberto.
 */
emailRouter.post('/email/send', sendLimiter, asyncHandler(async (req, res) => {
    const body = req.body ?? {};

    const recipients = (Array.isArray(body.to) ? body.to : [body.to])
        .filter(Boolean)
        .map((address) => requireEmail(address, 'destinatário'));

    if (recipients.length === 0) throw badRequest('Indique pelo menos um destinatário.');
    if (recipients.length > 50) throw badRequest('Máximo de 50 destinatários por mensagem.');

    const subject = requireString(body.subject, 'assunto', { max: 255 });
    const html = requireString(body.html ?? body.content, 'conteúdo', { max: 200000, trim: false });
    const replyTo = optionalEmail(body.replyTo);

    const sent = await sendMail({ to: recipients, subject, html, replyTo });

    await logAction({
        companyId: req.auth.companyId, userId: req.auth.userId,
        action: 'EMAIL_SEND',
        details: `Assunto "${subject}" para ${recipients.length} destinatário(s)${sent ? '' : ' (falhou)'}`,
        ip: req.ip,
    });

    if (!sent) throw badRequest('Não foi possível enviar a mensagem. Verifique a configuração de e-mail do servidor.');
    res.json({ ok: true });
}));

// =============================================================================
// DOMÍNIOS
// =============================================================================
// A verificação de domínios era feita através da Resend. Com o e-mail a
// passar pelo SMTP da Hostinger, esta tabela passa a ser um registo dos
// domínios da empresa e do estado do seu DNS, gerido manualmente no hPanel.

emailRouter.get('/email/domains', requireAdmin, asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM erp_domains WHERE company_id = ? ORDER BY domain', [req.auth.companyId]);
    res.json(rows.map((row) => ({
        id: row.id,
        domain: row.domain,
        status: row.status,
        dns_records: parseJson(row.dns_records, []),
        created_at: row.created_at,
    })));
}));

emailRouter.post('/email/domains', requireAdmin, asyncHandler(async (req, res) => {
    const domain = requireString(req.body?.domain, 'domínio', { max: 255 }).toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) throw badRequest('Nome de domínio inválido.');

    const id = newId();
    await query(
        `INSERT INTO erp_domains (id, company_id, domain, status, dns_records)
         VALUES (?,?,?,'pending',?)`,
        [id, req.auth.companyId, domain, toJson([
            // Registos que a Hostinger indica para a deteção automática de
            // definições pelos clientes de e-mail.
            { type: 'CNAME', host: 'autodiscover', points_to: 'autodiscover.mail.hostinger.com', ttl: 300 },
            { type: 'CNAME', host: 'autoconfig', points_to: 'autoconfig.mail.hostinger.com', ttl: 300 },
        ])]
    );

    const row = await queryOne('SELECT * FROM erp_domains WHERE id = ?', [id]);
    res.status(201).json({
        id: row.id, domain: row.domain, status: row.status,
        dns_records: parseJson(row.dns_records, []),
    });
}));

emailRouter.patch('/email/domains/:id', requireAdmin, asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'domínio');
    const status = requireEnum(req.body?.status, 'estado', ['not_started', 'pending', 'verified', 'failed']);

    const result = await query(
        'UPDATE erp_domains SET status = ? WHERE id = ? AND company_id = ?',
        [status, id, req.auth.companyId]
    );
    if (result.affectedRows === 0) throw notFound('Domínio não encontrado.');
    res.json({ ok: true });
}));

emailRouter.delete('/email/domains/:id', requireAdmin, asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id, 'domínio');
    const result = await query('DELETE FROM erp_domains WHERE id = ? AND company_id = ?', [id, req.auth.companyId]);
    if (result.affectedRows === 0) throw notFound('Domínio não encontrado.');
    res.json({ ok: true });
}));
