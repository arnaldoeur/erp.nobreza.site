/**
 * Cifra simétrica e derivação de tokens.
 *
 * Serve dois propósitos distintos:
 *
 *  1. Cifrar credenciais que o sistema precisa de conseguir ler de volta —
 *     as passwords SMTP e IMAP das contas de e-mail. Estas estavam guardadas
 *     em texto simples e eram devolvidas ao browser num `select('*')`.
 *
 *  2. Derivar o hash dos tokens de sessão e de recuperação. Aqui não há
 *     "ler de volta": guarda-se o hash, compara-se o hash.
 *
 * Passwords de utilizador não passam por aqui — essas usam bcrypt, que é
 * deliberadamente lento e não é reversível.
 */

import crypto from 'node:crypto';
import { config } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // Recomendado para GCM.
const TAG_LENGTH = 16;

/**
 * Cifra um texto com AES-256-GCM.
 *
 * O resultado é `iv || authTag || ciphertext` num único Buffer, para caber
 * numa só coluna VARBINARY. O GCM é autenticado: alterar o conteúdo na base
 * de dados faz a decifragem falhar em vez de devolver lixo silenciosamente.
 *
 * @param {string|null|undefined} plaintext
 * @returns {Buffer|null}
 */
export function encrypt(plaintext) {
    if (plaintext === null || plaintext === undefined || plaintext === '') return null;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, config.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

/**
 * Decifra um Buffer produzido por `encrypt`.
 *
 * Devolve null se o valor estiver ausente ou não puder ser autenticado — o
 * que acontece, por exemplo, se a ENCRYPTION_KEY tiver sido trocada depois de
 * os dados terem sido gravados.
 *
 * @param {Buffer|null|undefined} payload
 * @returns {string|null}
 */
export function decrypt(payload) {
    if (!payload || payload.length <= IV_LENGTH + TAG_LENGTH) return null;

    try {
        const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
        const iv = buffer.subarray(0, IV_LENGTH);
        const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const ciphertext = buffer.subarray(IV_LENGTH + TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, config.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch {
        // Não propagamos o erro: uma credencial ilegível é um problema de
        // configuração daquela conta de e-mail, não uma falha do pedido inteiro.
        return null;
    }
}

/**
 * Gera um token opaco para envio por e-mail (recuperação de password,
 * ativação de conta) e o respetivo hash para guardar.
 *
 * O token em claro só existe em memória e no e-mail enviado. A base de dados
 * guarda apenas o hash, pelo que ler a tabela não permite forjar um link.
 */
export function generateToken() {
    const token = crypto.randomBytes(32).toString('base64url');
    return { token, hash: hashToken(token) };
}

/**
 * SHA-256 de um token.
 *
 * SHA-256 simples é adequado aqui, ao contrário do que acontece com
 * passwords: o token tem 256 bits de entropia aleatória, pelo que não há
 * dicionário nem força bruta viável contra ele.
 */
export function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Comparação em tempo constante.
 *
 * Uma comparação normal com `===` termina no primeiro byte diferente, e a
 * diferença de tempo permite descobrir o valor correto byte a byte.
 */
export function safeEquals(a, b) {
    const bufferA = Buffer.from(String(a));
    const bufferB = Buffer.from(String(b));
    if (bufferA.length !== bufferB.length) return false;
    return crypto.timingSafeEqual(bufferA, bufferB);
}
