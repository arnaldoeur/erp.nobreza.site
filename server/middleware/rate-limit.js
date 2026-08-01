/**
 * Fábrica de limitadores de frequência.
 *
 * Centralizada para que todos os limites partilhem a mesma configuração e
 * para que possam ser desligados no ambiente de teste. Sem isso, uma suite
 * que faz dezenas de inícios de sessão seguidos esbarra no próprio limite —
 * o que aconteceu, e é a razão de este módulo existir.
 *
 * Em produção e em desenvolvimento os limites estão sempre ativos.
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

export function createLimiter({ windowMs, limit, message }) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: message },
        // Desligado apenas em testes automáticos.
        skip: () => config.isTest,
    });
}
