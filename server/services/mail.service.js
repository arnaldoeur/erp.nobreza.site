/**
 * Envio de e-mail por SMTP.
 *
 * Substitui a Edge Function `resend-domains`, que era um relay aberto: não
 * validava autenticação, respondia a qualquer origem, e aceitava remetente,
 * destinatário e corpo livres. Qualquer pessoa na internet podia enviar
 * e-mail em nome de sistema@nobreza.site.
 *
 * Aqui:
 *  - as credenciais vivem só no servidor, nas variáveis de ambiente;
 *  - o remetente é fixo (MAIL_FROM_ADDRESS) e o cliente nunca o escolhe;
 *  - só rotas autenticadas conseguem chegar a este módulo.
 */

import nodemailer from 'nodemailer';
import { config, mailConfigured } from '../config/env.js';

let transporter = null;

function getTransporter() {
    if (!mailConfigured) return null;
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: config.mail.host,
            port: config.mail.port,
            secure: config.mail.secure,
            auth: { user: config.mail.user, pass: config.mail.password },
            // A Hostinger fecha ligações inativas com alguma agressividade;
            // reutilizar a ligação para lotes evita reautenticar a cada envio.
            pool: true,
            maxConnections: 3,
            connectionTimeout: 15000,
            greetingTimeout: 10000,
        });
    }
    return transporter;
}

/** Escapa HTML para que conteúdo do utilizador não possa injetar marcação no e-mail. */
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Envolve o conteúdo no modelo visual do sistema.
 *
 * Estilos em linha, e não numa folha de estilos, porque o Gmail e o Outlook
 * descartam `<style>` no corpo da mensagem.
 */
function wrapHtml(innerHtml, subject) {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subject)}</title></head>
<body style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f8fafc;margin:0;padding:40px 10px;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:40px;border-radius:24px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.05);border:1px solid #f1f5f9;">
    <div style="width:48px;height:4px;background-color:#10b981;border-radius:2px;margin-bottom:32px;"></div>
    <div style="color:#1e293b;line-height:1.8;font-size:16px;">${innerHtml}</div>
    <div style="margin-top:48px;padding-top:24px;border-top:1px solid #f1f5f9;text-align:center;color:#94a3b8;font-size:11px;letter-spacing:0.05em;">
      &copy; ${year} <strong style="color:#64748b;">Nobreza ERP</strong> &bull; Gest&atilde;o Inteligente de Farm&aacute;cias<br/>
      Niassa, Mo&ccedil;ambique &bull; Desenvolvido por Zyph Tech
    </div>
  </div>
</body>
</html>`;
}

function button(url, label) {
    return `<a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;background:#10b981;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">${escapeHtml(label)}</a>`;
}

/**
 * Envia uma mensagem.
 *
 * Se o SMTP não estiver configurado (típico em desenvolvimento), escreve na
 * consola em vez de enviar. Em produção a configuração é obrigatória e o
 * arranque falha sem ela, por isso este ramo não acontece lá.
 *
 * Nunca lança: uma falha de envio não deve derrubar a operação de negócio que
 * a originou. Quem chama decide o que fazer com o `false`.
 */
export async function sendMail({ to, subject, html, text, attachments, replyTo }) {
    const recipients = Array.isArray(to) ? to : [to];

    const mailer = getTransporter();
    if (!mailer) {
        console.info(`[mail] SMTP não configurado. Mensagem não enviada para ${recipients.join(', ')}: "${subject}"`);
        return false;
    }

    try {
        await mailer.sendMail({
            from: `"${config.mail.fromName}" <${config.mail.fromAddress}>`,
            to: recipients.join(', '),
            subject,
            html: wrapHtml(html, subject),
            text: text || undefined,
            attachments: attachments || undefined,
            replyTo: replyTo || undefined,
        });
        return true;
    } catch (error) {
        console.error(`[mail] Falha ao enviar para ${recipients.join(', ')}: ${error.message}`);
        return false;
    }
}

export async function sendPasswordResetEmail(to, name, resetUrl, expiresInMinutes) {
    return sendMail({
        to,
        subject: 'Redefinição de Palavra-passe — Nobreza ERP',
        html: `
            <h2 style="margin-top:0;">Redefinição de Palavra-passe</h2>
            <p>Olá ${escapeHtml(name)},</p>
            <p>Recebemos um pedido para redefinir a palavra-passe da sua conta no Nobreza ERP.</p>
            <p style="margin:32px 0;">${button(resetUrl, 'Definir nova palavra-passe')}</p>
            <p style="font-size:13px;color:#64748b;">Este link é válido durante ${expiresInMinutes} minutos e só pode ser usado uma vez.</p>
            <p style="font-size:13px;color:#64748b;">Se não foi você que fez este pedido, ignore esta mensagem — a sua palavra-passe atual continua válida.</p>
        `,
    });
}

export async function sendAccountActivationEmail(to, name, activationUrl, expiresInHours) {
    return sendMail({
        to,
        subject: 'Ative a sua conta — Nobreza ERP',
        html: `
            <h2 style="margin-top:0;">Bem-vindo(a) ao Nobreza ERP</h2>
            <p>Olá ${escapeHtml(name)},</p>
            <p>A sua conta foi criada. Para começar a usar o sistema, defina a sua palavra-passe.</p>
            <p style="margin:32px 0;">${button(activationUrl, 'Definir palavra-passe')}</p>
            <p style="font-size:13px;color:#64748b;">Este link é válido durante ${expiresInHours} horas.</p>
        `,
    });
}

/**
 * Verifica se é possível autenticar num servidor SMTP.
 *
 * Usa uma ligação própria e descartável, para não perturbar o transporte
 * partilhado que envia as mensagens do sistema.
 */
export async function verifySmtpAccount({ host, port, secure, user, password }) {
    if (!host || !user || !password) {
        return { ok: false, message: 'Servidor, utilizador e palavra-passe são obrigatórios.' };
    }

    const probe = nodemailer.createTransport({
        host,
        port: port || 465,
        secure: secure !== false,
        auth: { user, pass: password },
        connectionTimeout: 10000,
        greetingTimeout: 8000,
    });

    try {
        await probe.verify();
        return { ok: true, message: 'Ligação estabelecida com sucesso.' };
    } catch (error) {
        return { ok: false, message: `Falha na ligação: ${error.message}` };
    } finally {
        probe.close();
    }
}
