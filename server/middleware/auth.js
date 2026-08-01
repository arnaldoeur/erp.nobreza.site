/**
 * Autenticação e delimitação de empresa (tenant).
 *
 * Este ficheiro é a substituição do Row Level Security do Supabase, e é o
 * ponto onde o isolamento entre empresas passa a ser garantido.
 *
 * A regra, sem exceções: `req.auth.companyId` vem sempre do token assinado e
 * nunca do corpo, dos parâmetros ou dos cabeçalhos do pedido. Toda a consulta
 * a uma tabela de negócio filtra por ele.
 *
 * No sistema anterior o `companyId` vinha do localStorage do browser e era
 * usado diretamente nas consultas — editá-lo bastava para operar sobre os
 * dados de outra empresa.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { unauthorized, forbidden } from '../utils/errors.js';

export const ACCESS_COOKIE = 'nobreza_access';
export const REFRESH_COOKIE = 'nobreza_refresh';

/**
 * Opções dos cookies de sessão.
 *
 * httpOnly impede o JavaScript da página de ler o token, o que limita o
 * estrago de um XSS. sameSite=lax bloqueia o envio em pedidos cruzados de
 * outros sites, que é a defesa contra CSRF para este desenho.
 */
export function cookieOptions(maxAgeMs) {
    return {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: maxAgeMs,
    };
}

function extractToken(req) {
    const fromCookie = req.cookies?.[ACCESS_COOKIE];
    if (fromCookie) return fromCookie;

    // O cabeçalho Authorization é aceite para facilitar testes e integrações;
    // o cliente web usa o cookie.
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) return header.slice(7);

    return null;
}

/**
 * Exige uma sessão válida e preenche `req.auth`.
 *
 * A partir daqui, qualquer rota pode confiar em `req.auth.companyId` como
 * verdade do servidor.
 */
export function requireAuth(req, _res, next) {
    const token = extractToken(req);
    if (!token) return next(unauthorized('Autenticação necessária.'));

    try {
        const payload = jwt.verify(token, config.auth.jwtSecret);
        req.auth = {
            userId: payload.sub,
            companyId: Number(payload.companyId),
            role: payload.role,
            isSuperAdmin: payload.superAdmin === true,
        };
        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            // Código distinto para que o cliente saiba que deve tentar renovar
            // a sessão em silêncio, em vez de mostrar o ecrã de login.
            return next(unauthorized('Sessão expirada.', 'TOKEN_EXPIRED'));
        }
        return next(unauthorized('Sessão inválida.'));
    }
}

/**
 * Restringe o acesso a determinados perfis.
 *
 * No sistema anterior, as permissões existiam apenas na interface — decidiam
 * que botões apareciam. Como o browser falava diretamente com a base de
 * dados, bastava contornar o ecrã para executar a operação à mesma.
 *
 * @param {...string} roles Perfis autorizados.
 */
export function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.auth) return next(unauthorized());
        // O super administrador é o operador da plataforma e passa em tudo.
        if (req.auth.isSuperAdmin) return next();
        if (!roles.includes(req.auth.role)) {
            return next(forbidden('Não tem permissão para executar esta operação.'));
        }
        return next();
    };
}

/** Atalho para operações reservadas à administração da empresa. */
export const requireAdmin = requireRole('ADMIN');

/** Reservado à gestão da plataforma, transversal a todas as empresas. */
export function requireSuperAdmin(req, _res, next) {
    if (!req.auth) return next(unauthorized());
    if (!req.auth.isSuperAdmin) return next(forbidden('Operação reservada à administração da plataforma.'));
    return next();
}
