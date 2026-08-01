/**
 * Configuração da aplicação, lida do ambiente e validada no arranque.
 *
 * A validação é deliberadamente estrita e falha logo no arranque em vez de
 * deixar o servidor subir meio configurado. Um sistema que arranca sem
 * JWT_SECRET e só se descobre quando o primeiro utilizador tenta entrar é
 * pior do que um sistema que não arranca.
 */

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const errors = [];

/** Lê uma variável obrigatória. Acumula o erro em vez de rebentar à primeira. */
function required(name, { minLength = 1 } = {}) {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
        errors.push(`${name} não está definida.`);
        return '';
    }
    if (value.length < minLength) {
        errors.push(`${name} é demasiado curta (mínimo ${minLength} caracteres).`);
    }
    return value;
}

function optional(name, fallback = '') {
    const value = process.env[name];
    return value === undefined || value === '' ? fallback : value;
}

function integer(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
        errors.push(`${name} tem de ser um número inteiro (recebeu "${raw}").`);
        return fallback;
    }
    return parsed;
}

function boolean(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    return raw === 'true' || raw === '1';
}

const nodeEnv = optional('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';

/**
 * Chave de cifra para as credenciais SMTP/IMAP guardadas na base de dados.
 * O AES-256-GCM exige exatamente 32 bytes; validamos aqui para que um valor
 * mal gerado não passe despercebido até à primeira tentativa de decifrar.
 */
function encryptionKey() {
    const raw = process.env.ENCRYPTION_KEY;
    if (!raw) {
        errors.push('ENCRYPTION_KEY não está definida. Gere com: openssl rand -base64 32');
        return null;
    }
    let buffer;
    try {
        buffer = Buffer.from(raw, 'base64');
    } catch {
        errors.push('ENCRYPTION_KEY não é base64 válido.');
        return null;
    }
    if (buffer.length !== 32) {
        errors.push(
            `ENCRYPTION_KEY tem de descodificar para 32 bytes (descodificou para ${buffer.length}). ` +
            'Gere com: openssl rand -base64 32'
        );
        return null;
    }
    return buffer;
}

export const config = {
    env: nodeEnv,
    isProduction,
    isTest: nodeEnv === 'test',
    port: integer('PORT', 3001),
    appUrl: optional('APP_URL', 'http://localhost:3000').replace(/\/$/, ''),
    rootDir: ROOT,

    db: {
        host: required('DB_HOST'),
        port: integer('DB_PORT', 3306),
        database: required('DB_NAME'),
        user: required('DB_USER'),
        password: process.env.DB_PASSWORD ?? '',
        connectionLimit: integer('DB_CONNECTION_LIMIT', 10),
    },

    auth: {
        // 32 caracteres é o mínimo razoável para um segredo HMAC-SHA256.
        jwtSecret: required('JWT_SECRET', { minLength: 32 }),
        jwtRefreshSecret: required('JWT_REFRESH_SECRET', { minLength: 32 }),
        accessTtl: optional('JWT_ACCESS_TTL', '15m'),
        refreshTtl: optional('JWT_REFRESH_TTL', '30d'),
        // Uma conta bloqueia após este número de tentativas falhadas seguidas.
        maxFailedLogins: integer('AUTH_MAX_FAILED_LOGINS', 5),
        lockoutMinutes: integer('AUTH_LOCKOUT_MINUTES', 15),
        // Validade dos links de recuperação de password e de ativação.
        resetTokenMinutes: integer('AUTH_RESET_TOKEN_MINUTES', 60),
        activationTokenHours: integer('AUTH_ACTIVATION_TOKEN_HOURS', 72),
    },

    encryptionKey: encryptionKey(),

    mail: {
        host: optional('SMTP_HOST', ''),
        port: integer('SMTP_PORT', 465),
        secure: boolean('SMTP_SECURE', true),
        user: optional('SMTP_USER', ''),
        password: optional('SMTP_PASSWORD', ''),
        fromName: optional('MAIL_FROM_NAME', 'Nobreza ERP'),
        fromAddress: optional('MAIL_FROM_ADDRESS', ''),
    },

    ai: {
        apiKey: optional('OPENROUTER_API_KEY', ''),
        model: optional('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
    },

    uploads: {
        dir: path.resolve(ROOT, optional('UPLOAD_DIR', './uploads')),
        maxBytes: integer('UPLOAD_MAX_BYTES', 5 * 1024 * 1024),
    },
};

/**
 * O envio de e-mail é opcional em desenvolvimento (as mensagens vão para a
 * consola), mas em produção sem SMTP a recuperação de password fica sem
 * canal de entrega — o que é exatamente a falha que esta migração corrige.
 */
export const mailConfigured = Boolean(config.mail.host && config.mail.user && config.mail.fromAddress);

if (isProduction && !mailConfigured) {
    errors.push(
        'Configuração SMTP incompleta (SMTP_HOST, SMTP_USER, MAIL_FROM_ADDRESS). ' +
        'Sem ela, a recuperação de password não tem como chegar aos utilizadores.'
    );
}

if (config.auth.jwtSecret && config.auth.jwtSecret === config.auth.jwtRefreshSecret) {
    errors.push(
        'JWT_SECRET e JWT_REFRESH_SECRET têm de ser diferentes. ' +
        'Iguais, um token de acesso expirado continua a valer como token de renovação.'
    );
}

if (errors.length > 0) {
    console.error('\nConfiguração inválida — o servidor não vai arrancar:\n');
    for (const error of errors) console.error(`  • ${error}`);
    console.error('\nConsulte .env.example para a lista completa de variáveis.\n');
    process.exit(1);
}
