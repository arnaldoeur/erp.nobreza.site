/**
 * Validação e normalização dos dados que entram pela API.
 *
 * Nada do que vem do cliente é tratado como confiável. No sistema anterior,
 * a identidade e o `companyId` vinham do localStorage do browser e eram
 * usados diretamente nas consultas — bastava editá-los para passar a operar
 * sobre outra empresa.
 */

import { badRequest } from './errors.js';
import { isUuid } from './ids.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function requireString(value, field, { max = 255, min = 1, trim = true } = {}) {
    if (typeof value !== 'string') throw badRequest(`O campo "${field}" é obrigatório.`);
    const result = trim ? value.trim() : value;
    if (result.length < min) throw badRequest(`O campo "${field}" é obrigatório.`);
    if (result.length > max) throw badRequest(`O campo "${field}" excede ${max} caracteres.`);
    return result;
}

export function optionalString(value, field, { max = 255, trim = true } = {}) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string') throw badRequest(`O campo "${field}" tem de ser texto.`);
    const result = trim ? value.trim() : value;
    if (result.length === 0) return null;
    if (result.length > max) throw badRequest(`O campo "${field}" excede ${max} caracteres.`);
    return result;
}

export function requireEmail(value, field = 'email') {
    const email = requireString(value, field, { max: 255 }).toLowerCase();
    if (!EMAIL_PATTERN.test(email)) throw badRequest('Endereço de e-mail inválido.');
    return email;
}

export function optionalEmail(value, field = 'email') {
    if (value === null || value === undefined || value === '') return null;
    return requireEmail(value, field);
}

/**
 * Converte um valor monetário para string com duas casas decimais.
 *
 * Devolve-se string e não Number porque a coluna é DECIMAL: passar um float
 * do JavaScript ao driver reintroduz o erro de vírgula flutuante que a
 * escolha de DECIMAL existe para evitar.
 */
export function requireMoney(value, field, { min = 0, max = 999999999999.99 } = {}) {
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
    if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
        throw badRequest(`O campo "${field}" tem de ser um valor numérico.`);
    }
    if (parsed < min) throw badRequest(`O campo "${field}" não pode ser inferior a ${min}.`);
    if (parsed > max) throw badRequest(`O campo "${field}" excede o valor máximo permitido.`);
    return parsed.toFixed(2);
}

export function optionalMoney(value, field, options = {}) {
    if (value === null || value === undefined || value === '') return '0.00';
    return requireMoney(value, field, options);
}

export function requireInt(value, field, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : value;
    if (!Number.isInteger(parsed)) throw badRequest(`O campo "${field}" tem de ser um número inteiro.`);
    if (parsed < min) throw badRequest(`O campo "${field}" não pode ser inferior a ${min}.`);
    if (parsed > max) throw badRequest(`O campo "${field}" excede o valor máximo permitido.`);
    return parsed;
}

export function optionalInt(value, field, options = {}) {
    if (value === null || value === undefined || value === '') return null;
    return requireInt(value, field, options);
}

export function requireEnum(value, field, allowed) {
    const result = requireString(value, field, { max: 64 });
    if (!allowed.includes(result)) {
        throw badRequest(`Valor inválido para "${field}". Valores aceites: ${allowed.join(', ')}.`);
    }
    return result;
}

export function optionalEnum(value, field, allowed, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    return requireEnum(value, field, allowed);
}

export function requireUuid(value, field) {
    if (!isUuid(value)) throw badRequest(`O identificador de "${field}" é inválido.`);
    return value;
}

export function optionalUuid(value, field) {
    if (value === null || value === undefined || value === '') return null;
    return requireUuid(value, field);
}

export function requireBoolean(value, fallback = false) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === 1 || value === '1';
}

/**
 * Converte uma data recebida do cliente para um objeto Date em UTC.
 *
 * Rejeita datas inválidas em vez de as deixar chegar ao MySQL, que as
 * converteria silenciosamente para '0000-00-00'.
 */
export function requireDate(value, field) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw badRequest(`A data em "${field}" é inválida.`);
    return date;
}

export function optionalDate(value, field) {
    if (value === null || value === undefined || value === '') return null;
    return requireDate(value, field);
}

/** Converte uma data para 'YYYY-MM-DD', o formato das colunas DATE. */
export function toDateOnly(value, field) {
    const date = optionalDate(value, field);
    return date ? date.toISOString().slice(0, 10) : null;
}

/**
 * Lê um valor de uma coluna JSON.
 *
 * O MySQL 8 devolve o valor já convertido em objeto; o MariaDB, onde JSON é
 * um alias de LONGTEXT, devolve uma string. Esta função aceita ambos, para
 * que o mesmo código funcione nos dois servidores.
 */
export function parseJson(value, fallback = null) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

/** Serializa um valor para uma coluna JSON. */
export function toJson(value) {
    if (value === null || value === undefined) return null;
    return JSON.stringify(value);
}

/** Converte um DECIMAL devolvido como string para número, para a resposta JSON. */
export function toNumber(value, fallback = 0) {
    if (value === null || value === undefined) return fallback;
    const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/** Converte TINYINT(1) em booleano. */
export function toBoolean(value) {
    return value === 1 || value === true || value === '1';
}

/** Limita a paginação a um intervalo sensato, para impedir leituras enormes. */
export function pagination(query, { defaultLimit = 50, maxLimit = 200 } = {}) {
    const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
    const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
    return { limit, offset: (page - 1) * limit, page };
}
