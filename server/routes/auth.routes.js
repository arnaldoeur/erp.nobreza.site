/**
 * Rotas de autenticação.
 *
 * Todas as rotas públicas deste ficheiro têm limitação de frequência: são a
 * porta de entrada do sistema e, sem limite, uma máquina consegue testar
 * milhares de palavras-passe por minuto.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, badRequest, unauthorized } from '../utils/errors.js';
import { requireEmail, requireString } from '../utils/validate.js';
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions, requireAuth } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';
import { logAction } from '../services/log.service.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas tentativas de início de sessão. Aguarde 15 minutos.' },
});

// Mais restritivo: cada pedido aceite envia um e-mail, pelo que sem limite
// isto seria uma forma de inundar a caixa de correio de terceiros.
const resetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiados pedidos de recuperação. Tente novamente dentro de uma hora.' },
});

/** Coloca os tokens em cookies httpOnly. O JavaScript da página não lhes acede. */
function setSessionCookies(res, accessToken, refreshToken) {
    res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(authService.accessTtlMs));
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(authService.refreshTtlMs));
}

function clearSessionCookies(res) {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

authRouter.post('/login', loginLimiter, asyncHandler(async (req, res) => {
    const email = requireEmail(req.body?.email);
    const password = requireString(req.body?.password, 'palavra-passe', { max: 200, trim: false });

    const { user, accessToken, refreshToken } = await authService.login(email, password, {
        userAgent: req.get('user-agent'),
        ip: req.ip,
    });

    setSessionCookies(res, accessToken, refreshToken);
    await logAction({ companyId: user.companyId, userId: user.id, userName: user.name, action: 'LOGIN', details: 'Início de sessão', ip: req.ip });

    res.json({ user });
}));

authRouter.post('/refresh', asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    const { user, accessToken, refreshToken } = await authService.refresh(token, {
        userAgent: req.get('user-agent'),
        ip: req.ip,
    });

    setSessionCookies(res, accessToken, refreshToken);
    res.json({ user });
}));

authRouter.post('/logout', asyncHandler(async (req, res) => {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    clearSessionCookies(res);
    res.json({ ok: true });
}));

/** Devolve o utilizador da sessão atual. É a fonte de verdade da identidade. */
authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
    const user = await authService.getUserById(req.auth.userId);
    if (!user) throw unauthorized();
    res.json({ user });
}));

/**
 * Pede a recuperação de palavra-passe.
 *
 * Responde sempre 200, exista ou não a conta: a resposta não pode servir para
 * descobrir que endereços estão registados.
 */
authRouter.post('/password/forgot', resetLimiter, asyncHandler(async (req, res) => {
    const email = requireEmail(req.body?.email);
    await authService.requestPasswordReset(email);
    res.json({
        ok: true,
        message: 'Se existir uma conta associada a este e-mail, receberá as instruções dentro de instantes.',
    });
}));

/** Conclui a recuperação ou a ativação com o token recebido por e-mail. */
authRouter.post('/password/reset', asyncHandler(async (req, res) => {
    const token = requireString(req.body?.token, 'token', { max: 200 });
    const password = requireString(req.body?.password, 'palavra-passe', { max: 200, trim: false });

    await authService.resetPassword(token, password);
    clearSessionCookies(res);
    res.json({ ok: true, message: 'Palavra-passe definida. Já pode iniciar sessão.' });
}));

/** Troca a palavra-passe de quem já tem sessão iniciada. */
authRouter.post('/password/change', requireAuth, asyncHandler(async (req, res) => {
    const currentPassword = requireString(req.body?.currentPassword, 'palavra-passe atual', { max: 200, trim: false });
    const newPassword = requireString(req.body?.newPassword, 'nova palavra-passe', { max: 200, trim: false });

    if (currentPassword === newPassword) throw badRequest('A nova palavra-passe tem de ser diferente da atual.');

    await authService.changePassword(req.auth.userId, currentPassword, newPassword);
    clearSessionCookies(res);
    await logAction({ companyId: req.auth.companyId, userId: req.auth.userId, action: 'PASSWORD_CHANGE', details: 'Palavra-passe alterada', ip: req.ip });

    res.json({ ok: true, message: 'Palavra-passe alterada. Inicie sessão novamente.' });
}));

/**
 * Confirma a palavra-passe do utilizador atual sem alterar nada.
 *
 * Usado pelo modal que protege operações destrutivas na interface.
 */
authRouter.post('/password/verify', requireAuth, loginLimiter, asyncHandler(async (req, res) => {
    const password = requireString(req.body?.password, 'palavra-passe', { max: 200, trim: false });

    // Verificação pura: não emite nem rotaciona tokens, ao contrário do login.
    const valid = await authService.verifyPassword(req.auth.userId, password);
    if (!valid) throw unauthorized('Palavra-passe incorreta.');

    res.json({ ok: true });
}));
