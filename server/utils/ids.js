import crypto from 'node:crypto';

/**
 * Gera um UUID v4.
 *
 * O Postgres tinha `gen_random_uuid()` como valor por omissão das colunas.
 * O MySQL não tem equivalente utilizável como default, por isso os
 * identificadores passam a ser gerados aqui, antes do INSERT.
 */
export function newId() {
    return crypto.randomUUID();
}

/**
 * Verifica se um valor tem a forma de um UUID.
 *
 * Usado para rejeitar identificadores malformados na fronteira da API. Sem
 * isto, o Postgres devolvia o erro 22P02 e o frontend tinha código a tratá-lo
 * (`if (error.code === '22P02') return null`) — sintoma de validação a
 * acontecer no sítio errado.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
    return typeof value === 'string' && UUID_PATTERN.test(value);
}
