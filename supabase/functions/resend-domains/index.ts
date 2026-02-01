import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Premium Responsive HTML Email Wrapper (Inline Styles for Max Compatibility)
 */
function wrap(html: string, sub: string) {
    const year = new Date().getFullYear();
    const primaryColor = "#10b981"; // Emerald 500
    const textColor = "#1e293b"; // Slate 800

    return `<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sub}</title>
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 10px; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 24px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9;">
        <div style="width: 48px; height: 4px; background-color: ${primaryColor}; border-radius: 2px; margin-bottom: 32px;"></div>
        <div style="color: ${textColor}; line-height: 1.8; font-size: 16px;">
            ${html}
        </div>
        <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 11px; letter-spacing: 0.05em;">
            &copy; ${year} <strong style="color: #64748b;">Nobreza ERP</strong> • Gestão Inteligente de Farmácias<br/>
            Niassa, Moçambique • Desenvolvido por Zyph Tech
        </div>
    </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
        const b = await req.json();
        const action = b.action;
        const auth = "Bearer " + RESEND_API_KEY;

        // Actions implementation...
        if (action === "ADD_DOMAIN") {
            const resp = await fetch("https://api.resend.com/domains", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": auth }, body: JSON.stringify({ name: b.domain }) });
            return new Response(JSON.stringify(await resp.json()), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (action === "VERIFY_DOMAIN") {
            await fetch("https://api.resend.com/domains/" + b.id + "/verify", { method: "POST", headers: { "Authorization": auth } });
            const data = await fetch("https://api.resend.com/domains/" + b.id, { headers: { "Authorization": auth } }).then(r => r.json());
            return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (action === "LIST_DOMAINS") {
            const resp = await fetch("https://api.resend.com/domains", { headers: { "Authorization": auth } });
            return new Response(JSON.stringify(await resp.json()), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (action === "DELETE_DOMAIN") {
            const resp = await fetch("https://api.resend.com/domains/" + b.id, { method: "DELETE", headers: { "Authorization": auth } });
            return new Response(JSON.stringify(await resp.json()), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (action === "SEND_EMAIL") {
            const subject = b.subject || "Nobreza ERP Notification";
            const resp = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": auth },
                body: JSON.stringify({
                    from: b.from || "Nobreza ERP <sistema@nobreza.site>",
                    to: b.to,
                    subject: subject,
                    html: wrap(b.html || "", subject),
                    attachments: b.attachments,
                    reply_to: b.reply_to
                })
            });
            return new Response(JSON.stringify(await resp.json()), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (action === "REQUEST_PASSWORD_RESET") {
            const html = "<h2>Recuperação de Senha</h2><p>Recebemos um pedido para redefinir a sua palavra-passe no Nobreza ERP.</p><p>Clique no botão abaixo para prosseguir:</p><a href='" + b.redirectTo + "' style='display:inline-block;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;'>Redefinir Senha</a><p style='margin-top:20px;font-size:12px;color:#64748b;'>Se não solicitou esta alteração, ignore este e-mail.</p>";
            const resp = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": auth }, body: JSON.stringify({ from: "Nobreza ERP <sistema@nobreza.site>", to: b.email, subject: "Redefinição de Senha - Nobreza ERP", html: wrap(html, "Redefinição de Senha") }) });
            return new Response(JSON.stringify(await resp.json()), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (action === "SEND_MAGIC_LINK") {
            const html = "<h2>Acesso Rápido</h2><p>Clique no botão abaixo para entrar diretamente na sua conta do Nobreza ERP:</p><a href='" + b.redirectTo + "' style='display:inline-block;padding:12px 24px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;'>Entrar no Sistema</a><p style='margin-top:20px;font-size:12px;color:#64748b;'>Este link é válido por tempo limitado.</p>";
            const resp = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": auth }, body: JSON.stringify({ from: "Nobreza ERP <sistema@nobreza.site>", to: b.email, subject: "Link de Acesso - Nobreza ERP", html: wrap(html, "Link de Acesso") }) });
            return new Response(JSON.stringify(await resp.json()), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders });
    }
});
