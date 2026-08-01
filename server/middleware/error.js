/**
 * Tratamento centralizado de erros.
 *
 * Objetivo duplo: dar ao utilizador uma mensagem útil em português, e não
 * deixar escapar detalhe interno. Uma mensagem de erro do MySQL revela nomes
 * de tabelas, colunas e restrições — informação que ajuda quem esteja a
 * sondar o sistema.
 */

import { ApiError } from '../utils/errors.js';
import { config } from '../config/env.js';

/** Traduz erros do driver MySQL em respostas compreensíveis. */
function translateDatabaseError(error) {
    switch (error.code) {
        case 'ER_DUP_ENTRY':
            return { status: 409, message: 'Já existe um registo com estes dados.' };
        case 'ER_NO_REFERENCED_ROW':
        case 'ER_NO_REFERENCED_ROW_2':
            return { status: 400, message: 'O registo referenciado não existe.' };
        case 'ER_ROW_IS_REFERENCED':
        case 'ER_ROW_IS_REFERENCED_2':
            return { status: 409, message: 'Não é possível remover: existem registos dependentes deste.' };
        case 'ER_DATA_TOO_LONG':
            return { status: 400, message: 'Um dos campos excede o tamanho permitido.' };
        case 'WARN_DATA_TRUNCATED':
            return { status: 400, message: 'Um dos valores enviados não é aceite neste campo.' };
        case 'ER_LOCK_WAIT_TIMEOUT':
        case 'ER_LOCK_DEADLOCK':
            return { status: 409, message: 'A operação entrou em conflito com outra em curso. Tente novamente.' };
        case 'PROTOCOL_CONNECTION_LOST':
        case 'ECONNREFUSED':
        case 'ETIMEDOUT':
            return { status: 503, message: 'A base de dados está temporariamente indisponível.' };
        default:
            return null;
    }
}

// eslint-disable-next-line no-unused-vars -- o Express exige a assinatura de 4 argumentos
export function errorHandler(error, req, res, _next) {
    if (error instanceof ApiError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
    }

    const translated = translateDatabaseError(error);
    if (translated) {
        console.error(`[api] ${req.method} ${req.originalUrl} — ${error.code}: ${error.message}`);
        return res.status(translated.status).json({ error: translated.message });
    }

    // Erro inesperado: regista-se com detalhe do lado do servidor, e responde-se
    // com uma mensagem genérica.
    console.error(`[api] ${req.method} ${req.originalUrl} — erro não tratado:`, error);
    return res.status(500).json({
        error: 'Ocorreu um erro interno. A equipa técnica foi notificada.',
        ...(config.isProduction ? {} : { detail: error.message, stack: error.stack }),
    });
}

export function notFoundHandler(req, res) {
    res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}
