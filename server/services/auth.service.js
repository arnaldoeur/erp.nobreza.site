/**
 * Autenticação.
 *
 * Substitui o Supabase Auth. As diferenças em relação ao que existia não são
 * apenas de implementação — corrigem falhas concretas:
 *
 *  - O login já não cria contas. O código anterior, quando não encontrava o
 *    perfil, criava um utilizador com `role: 'ADMIN'` e ligava-o à primeira
 *    empresa que encontrasse na base de dados. Quem conseguisse registar-se
 *    entrava como administrador de uma empresa existente.
 *
 *  - A recuperação de palavra-passe passa a ter um token a sério. O e-mail
 *    anterior levava para `/#reset-password` sem token nenhum, e a troca
 *    exigia uma sessão já iniciada — pelo que nunca podia funcionar para
 *    quem tinha esquecido a palavra-passe.
 *
 *  - As mensagens de erro deixam de distinguir "e-mail não existe" de
 *    "palavra-passe errada", o que permitia enumerar quem tem conta.
 *
 *  - Tentativas falhadas seguidas bloqueiam a conta temporariamente.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { query, queryOne, transaction } from '../db/pool.js';
import { newId } from '../utils/ids.js';
import { generateToken, hashToken } from '../utils/crypto.js';
import { badRequest, forbidden, unauthorized } from '../utils/errors.js';
import { sendPasswordResetEmail, sendAccountActivationEmail } from './mail.service.js';

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

/** Mensagem única para qualquer falha de credenciais, para não revelar o que falhou. */
const CREDENTIALS_ERROR = 'E-mail ou palavra-passe incorretos.';

export function hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Valida a robustez de uma palavra-passe.
 *
 * O sistema anterior não tinha qualquer requisito.
 */
export function assertPasswordStrength(password) {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        throw badRequest(`A palavra-passe tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
    if (password.length > 200) {
        throw badRequest('A palavra-passe é demasiado longa.');
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        throw badRequest('A palavra-passe tem de conter pelo menos uma letra e um número.');
    }
}

/**
 * Constrói o token de acesso.
 *
 * O `companyId` vai dentro do token, assinado. É esta a substituição do RLS:
 * o servidor sabe a que empresa o pedido pertence sem perguntar ao cliente,
 * e o cliente não tem forma de alterar o valor sem invalidar a assinatura.
 */
function signAccessToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            companyId: Number(user.company_id),
            role: user.role,
            superAdmin: user.is_super_admin === 1,
        },
        config.auth.jwtSecret,
        { expiresIn: config.auth.accessTtl }
    );
}

export function verifyAccessToken(token) {
    return jwt.verify(token, config.auth.jwtSecret);
}

/** Converte '30d', '15m', '2h' em milissegundos. */
function ttlToMs(ttl) {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const value = Number.parseInt(match[1], 10);
    const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
    return value * unit;
}

export const refreshTtlMs = ttlToMs(config.auth.refreshTtl);
export const accessTtlMs = ttlToMs(config.auth.accessTtl);

/**
 * Emite um token de renovação e guarda apenas o seu hash.
 *
 * Guardar o token em claro permitiria a quem lesse a base de dados assumir
 * qualquer sessão ativa.
 */
async function issueRefreshToken(userId, meta = {}) {
    const { token, hash } = generateToken();
    const expiresAt = new Date(Date.now() + refreshTtlMs);

    await query(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newId(), userId, hash, expiresAt, meta.userAgent?.slice(0, 255) ?? null, meta.ip?.slice(0, 45) ?? null]
    );

    return token;
}

/** Campos do utilizador devolvidos ao cliente. Nunca inclui password_hash. */
const USER_FIELDS = `
    id, company_id, name, email, role, is_super_admin, employee_id, sequential_id,
    responsibility, photo, contact, location, social_security_number,
    base_salary, base_hours, hire_date, active, last_login_at, created_at
`;

export function mapUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        companyId: Number(row.company_id),
        name: row.name,
        email: row.email,
        role: row.role,
        isSuperAdmin: row.is_super_admin === 1,
        employeeId: row.employee_id ?? undefined,
        sequentialId: row.sequential_id ?? undefined,
        responsibility: row.responsibility ?? undefined,
        photo: row.photo ?? undefined,
        contact: row.contact ?? undefined,
        location: row.location ?? undefined,
        socialSecurityNumber: row.social_security_number ?? undefined,
        baseSalary: row.base_salary === null ? undefined : Number(row.base_salary),
        baseHours: row.base_hours === null ? undefined : Number(row.base_hours),
        hireDate: row.hire_date ?? row.created_at,
        active: row.active === 1,
    };
}

/**
 * Autentica um utilizador.
 *
 * A ordem das verificações é deliberada: comparamos sempre a palavra-passe,
 * mesmo quando o utilizador não existe, para que o tempo de resposta não
 * denuncie a diferença.
 */
export async function login(email, password, meta = {}) {
    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await queryOne(
        `SELECT u.*, c.active AS company_active, c.name AS company_name
           FROM users u
           JOIN companies c ON c.id = u.company_id
          WHERE u.email = ?`,
        [normalizedEmail]
    );

    // Hash descartável para igualar o tempo gasto quando a conta não existe.
    const DUMMY_HASH = '$2b$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTU';
    const passwordMatches = await bcrypt.compare(String(password), user?.password_hash || DUMMY_HASH);

    if (!user || !user.password_hash) throw unauthorized(CREDENTIALS_ERROR);

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const minutes = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
        throw forbidden(`Conta temporariamente bloqueada por tentativas falhadas. Tente novamente dentro de ${minutes} minuto(s).`);
    }

    if (!passwordMatches) {
        const attempts = user.failed_login_attempts + 1;
        const shouldLock = attempts >= config.auth.maxFailedLogins;
        await query(
            `UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?`,
            [shouldLock ? 0 : attempts, shouldLock ? new Date(Date.now() + config.auth.lockoutMinutes * 60000) : null, user.id]
        );
        throw unauthorized(CREDENTIALS_ERROR);
    }

    // Estas duas verificações vêm depois da palavra-passe: dizer "conta
    // inativa" a quem não sabe a palavra-passe confirmaria que a conta existe.
    if (user.active !== 1) throw forbidden('A sua conta está inativa. Contacte o administrador.');
    if (user.company_active !== 1) throw forbidden('A empresa associada a esta conta está bloqueada.');

    await query(
        `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = UTC_TIMESTAMP(3) WHERE id = ?`,
        [user.id]
    );

    const refreshToken = await issueRefreshToken(user.id, meta);
    return { user: mapUser(user), accessToken: signAccessToken(user), refreshToken };
}

/**
 * Troca um token de renovação válido por um novo par de tokens.
 *
 * O token antigo é revogado no mesmo passo (rotação): se um token roubado for
 * usado, a sessão legítima deixa de funcionar e a intrusão torna-se visível.
 */
export async function refresh(refreshToken, meta = {}) {
    if (!refreshToken) throw unauthorized();

    const stored = await queryOne(
        `SELECT rt.*, u.*, c.active AS company_active
           FROM refresh_tokens rt
           JOIN users u ON u.id = rt.user_id
           JOIN companies c ON c.id = u.company_id
          WHERE rt.token_hash = ?`,
        [hashToken(refreshToken)]
    );

    if (!stored || stored.revoked_at || new Date(stored.expires_at) < new Date()) {
        throw unauthorized('Sessão expirada. Inicie sessão novamente.');
    }
    if (stored.active !== 1 || stored.company_active !== 1) {
        throw forbidden('Conta ou empresa inativa.');
    }

    await query('UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP(3) WHERE id = ?', [stored.id]);
    const newRefreshToken = await issueRefreshToken(stored.user_id, meta);

    return { user: mapUser(stored), accessToken: signAccessToken(stored), refreshToken: newRefreshToken };
}

export async function logout(refreshToken) {
    if (!refreshToken) return;
    await query(
        'UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP(3) WHERE token_hash = ? AND revoked_at IS NULL',
        [hashToken(refreshToken)]
    );
}

/** Revoga todas as sessões de um utilizador. Usado ao trocar a palavra-passe. */
export async function revokeAllSessions(userId, connection = null) {
    const sql = 'UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL';
    if (connection) await connection.execute(sql, [userId]);
    else await query(sql, [userId]);
}

export async function getUserById(userId) {
    const row = await queryOne(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [userId]);
    return mapUser(row);
}

/**
 * Inicia a recuperação de palavra-passe.
 *
 * Responde sempre com sucesso, exista ou não a conta. O sistema anterior
 * dizia explicitamente "E-mail não encontrado no sistema", o que permitia
 * descobrir quem tem conta simplesmente testando endereços.
 */
export async function requestPasswordReset(email) {
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await queryOne(
        'SELECT id, name, email, active, password_hash FROM users WHERE email = ?',
        [normalizedEmail]
    );

    if (!user || user.active !== 1) return;

    const { token, hash } = generateToken();
    const expiresAt = new Date(Date.now() + config.auth.resetTokenMinutes * 60000);
    // Uma conta ainda sem palavra-passe recebe o fluxo de ativação, que é o
    // mesmo mecanismo com outra mensagem e outra validade.
    const purpose = user.password_hash ? 'PASSWORD_RESET' : 'ACCOUNT_ACTIVATION';

    await transaction(async (connection) => {
        // Invalida pedidos anteriores por usar: dois links válidos em
        // simultâneo duplicam a janela de oportunidade sem qualquer benefício.
        await connection.execute(
            'UPDATE auth_tokens SET used_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND purpose = ? AND used_at IS NULL',
            [user.id, purpose]
        );
        await connection.execute(
            'INSERT INTO auth_tokens (id, user_id, purpose, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
            [newId(), user.id, purpose, hash, expiresAt]
        );
    });

    const url = `${config.appUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
    if (purpose === 'ACCOUNT_ACTIVATION') {
        await sendAccountActivationEmail(user.email, user.name, url, config.auth.activationTokenHours);
    } else {
        await sendPasswordResetEmail(user.email, user.name, url, config.auth.resetTokenMinutes);
    }
}

/** Cria e envia um convite de ativação. Usado ao adicionar alguém à equipa. */
export async function sendActivationInvite(userId) {
    const user = await queryOne('SELECT id, name, email, active FROM users WHERE id = ?', [userId]);
    if (!user || user.active !== 1) return false;

    const { token, hash } = generateToken();
    const expiresAt = new Date(Date.now() + config.auth.activationTokenHours * 3600000);

    await transaction(async (connection) => {
        await connection.execute(
            `UPDATE auth_tokens SET used_at = UTC_TIMESTAMP(3)
              WHERE user_id = ? AND purpose = 'ACCOUNT_ACTIVATION' AND used_at IS NULL`,
            [user.id]
        );
        await connection.execute(
            `INSERT INTO auth_tokens (id, user_id, purpose, token_hash, expires_at)
             VALUES (?, ?, 'ACCOUNT_ACTIVATION', ?, ?)`,
            [newId(), user.id, hash, expiresAt]
        );
    });

    const url = `${config.appUrl}/ativar-conta?token=${encodeURIComponent(token)}`;
    return sendAccountActivationEmail(user.email, user.name, url, config.auth.activationTokenHours);
}

/**
 * Conclui a recuperação ou a ativação, definindo a nova palavra-passe.
 *
 * O token é consumido (`used_at`) e todas as sessões existentes são revogadas
 * na mesma transação: quem tiver a conta comprometida perde o acesso no
 * momento em que o dono a recupera.
 */
export async function resetPassword(token, newPassword) {
    assertPasswordStrength(newPassword);

    const record = await queryOne(
        `SELECT t.id, t.user_id, t.purpose, t.expires_at, t.used_at, u.active
           FROM auth_tokens t
           JOIN users u ON u.id = t.user_id
          WHERE t.token_hash = ?`,
        [hashToken(token)]
    );

    if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
        throw badRequest('Este link é inválido ou já expirou. Peça um novo.');
    }
    if (record.active !== 1) throw forbidden('A conta está inativa.');

    const passwordHash = await hashPassword(newPassword);

    await transaction(async (connection) => {
        await connection.execute(
            `UPDATE users
                SET password_hash = ?, email_verified_at = UTC_TIMESTAMP(3),
                    failed_login_attempts = 0, locked_until = NULL
              WHERE id = ?`,
            [passwordHash, record.user_id]
        );
        await connection.execute('UPDATE auth_tokens SET used_at = UTC_TIMESTAMP(3) WHERE id = ?', [record.id]);
        await revokeAllSessions(record.user_id, connection);
    });
}

/**
 * Confirma a palavra-passe de um utilizador sem tocar na sessão.
 *
 * Serve o modal de confirmação que protege operações destrutivas. Não emite
 * tokens nem incrementa o contador de tentativas falhadas — quem chega aqui
 * já tem sessão válida.
 */
export async function verifyPassword(userId, password) {
    const user = await queryOne('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user || !user.password_hash) return false;
    return bcrypt.compare(String(password), user.password_hash);
}

/** Troca a palavra-passe de quem já tem sessão iniciada. */
export async function changePassword(userId, currentPassword, newPassword) {
    assertPasswordStrength(newPassword);

    const user = await queryOne('SELECT id, password_hash FROM users WHERE id = ?', [userId]);
    if (!user || !user.password_hash) throw unauthorized();

    const matches = await bcrypt.compare(String(currentPassword), user.password_hash);
    if (!matches) throw badRequest('A palavra-passe atual está incorreta.');

    const passwordHash = await hashPassword(newPassword);
    await transaction(async (connection) => {
        await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
        await revokeAllSessions(userId, connection);
    });
}

/**
 * Remove tokens expirados.
 *
 * Chamado periodicamente pelo servidor. Sem isto, as tabelas de tokens
 * crescem indefinidamente numa base de dados de alojamento partilhado, onde
 * o espaço é limitado.
 */
export async function purgeExpiredTokens() {
    const [refreshResult, authResult] = await Promise.all([
        query('DELETE FROM refresh_tokens WHERE expires_at < UTC_TIMESTAMP(3) OR revoked_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 7 DAY)'),
        query('DELETE FROM auth_tokens WHERE expires_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 DAY)'),
    ]);
    return { refreshTokens: refreshResult.affectedRows ?? 0, authTokens: authResult.affectedRows ?? 0 };
}
