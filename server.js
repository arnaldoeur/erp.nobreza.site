/**
 * Ponto de entrada da aplicação.
 *
 * É o ficheiro que a Hostinger arranca (Deployments → Entry file).
 *
 * Antes, este ficheiro apenas servia os ficheiros estáticos da pasta `dist`:
 * o "backend" real era o Supabase, contactado diretamente pelo browser. Agora
 * é aqui que vive a API, e o browser não fala com mais nada.
 *
 * Sobre arrancar com defeito
 * --------------------------
 * Uma versão anterior terminava o processo quando a configuração estava
 * incompleta ou a base de dados inacessível. A intenção era boa — falhar
 * alto em vez de servir erros silenciosos — mas o resultado prático era o
 * oposto: sem processo a escutar, o alojamento devolvia uma página 503
 * genérica, igual para todas as avarias possíveis, e a causa ficava apenas
 * nos logs.
 *
 * Agora o servidor arranca sempre. Se não puder servir a aplicação, serve o
 * diagnóstico: diz o que falta e o que fazer. Um erro que se lê no browser
 * resolve-se em minutos; um que só existe nos logs pode levar horas.
 */

import http from 'node:http';
import { config, configErrors } from './server/config/env.js';

/**
 * Traduz o código de erro do MySQL na causa concreta e no que verificar.
 *
 * Trabalhamos a partir do código e não da mensagem original: a mensagem do
 * driver inclui o utilizador e o servidor, e esta página é pública enquanto
 * a aplicação estiver em baixo.
 */
function explainDatabaseError(code) {
    switch (code) {
        case 'ECONNREFUSED':
            return 'Não há nenhum servidor MySQL a escutar no endereço indicado. Normalmente significa que DB_HOST está errado — em alojamento partilhado, a base de dados costuma estar noutro servidor e não em localhost.';
        case 'ENOTFOUND':
        case 'EAI_AGAIN':
            return 'O nome em DB_HOST não foi resolvido. Confirme que está escrito corretamente.';
        case 'ETIMEDOUT':
            return 'A ligação expirou sem resposta. O endereço está certo mas algo a bloqueia — em ligações remotas, é preciso autorizar o acesso em MySQL Remoto no painel.';
        case 'ER_ACCESS_DENIED_ERROR':
            return 'O servidor MySQL recusou as credenciais. Verifique DB_USER e DB_PASSWORD, e confirme que esse utilizador tem autorização para ligar a partir deste servidor.';
        case 'ER_BAD_DB_ERROR':
            return 'As credenciais estão certas mas a base de dados indicada em DB_NAME não existe.';
        case 'ER_DBACCESS_DENIED_ERROR':
            return 'O utilizador existe mas não tem permissões nesta base de dados.';
        default:
            return 'Consulte os Runtime logs para a mensagem completa do MySQL.';
    }
}

/**
 * Servidor mínimo que responde a tudo com o diagnóstico.
 *
 * Deliberadamente sem Express e sem base de dados: tem de funcionar
 * exatamente quando o resto não funciona.
 */
function startDiagnosticServer(problem) {
    const server = http.createServer((req, res) => {
        const body = { status: 'misconfigured', ...problem };

        if (req.url && req.url.startsWith('/api/')) {
            res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify(body, null, 2));
        }

        const items = problem.details.map((detail) => `<li>${detail}</li>`).join('');
        res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html>
<html lang="pt">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nobreza ERP — configuração incompleta</title>
<style>
  body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 42rem;
         margin: 4rem auto; padding: 0 1.5rem; color: #1f2937; background: #f9fafb; }
  h1 { font-size: 1.5rem; margin-bottom: .25rem; }
  p.sub { color: #6b7280; margin-top: 0; }
  ul { background: #fff; border: 1px solid #e5e7eb; border-left: 4px solid #ef4444;
       border-radius: .5rem; padding: 1rem 1rem 1rem 2.5rem; }
  li { margin: .35rem 0; }
  footer { color: #6b7280; font-size: .875rem; margin-top: 2rem; }
</style>
<h1>A aplicação não conseguiu arrancar</h1>
<p class="sub">${problem.summary}</p>
<ul>${items}</ul>
<p>Corrija estes pontos em <strong>Environment variables</strong>, no painel de
alojamento, e faça <strong>Save and redeploy</strong>. Esta página desaparece
assim que a aplicação arrancar.</p>
<footer>Nobreza ERP • diagnóstico de arranque</footer>
</html>`);
    });

    server.listen(config.port, () => {
        console.error(`[servidor] Modo de diagnóstico na porta ${config.port}: ${problem.summary}`);
    });
}

// -----------------------------------------------------------------------------
// Arranque
// -----------------------------------------------------------------------------

if (configErrors.length > 0) {
    startDiagnosticServer({
        summary: 'Faltam variáveis de ambiente, ou têm valores inválidos.',
        details: configErrors,
    });
} else {
    const { createApp } = await import('./server/app.js');
    const { ping, closePool } = await import('./server/db/pool.js');
    const { purgeExpiredTokens } = await import('./server/services/auth.service.js');

    let databaseError = null;
    try {
        await ping();
        console.log(`[servidor] Ligado à base de dados ${config.db.database} em ${config.db.host}`);
    } catch (error) {
        // A mensagem completa vai para os logs; a página pública recebe só a
        // explicação derivada do código.
        console.error('[servidor] Não foi possível ligar à base de dados:', error.message);
        databaseError = error;
    }

    if (databaseError) {
        startDiagnosticServer({
            summary: 'A aplicação arrancou mas não consegue chegar à base de dados.',
            code: databaseError.code || 'desconhecido',
            details: [
                `Código do erro: ${databaseError.code || 'desconhecido'}`,
                explainDatabaseError(databaseError.code),
            ],
        });
    } else {
        const app = createApp();

        const server = app.listen(config.port, () => {
            console.log(`[servidor] Nobreza ERP a escutar na porta ${config.port} (${config.env})`);
        });

        /**
         * Limpeza periódica de tokens expirados.
         *
         * `unref()` para que este temporizador não impeça o processo de
         * terminar quando lhe for pedido que encerre.
         */
        const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
        const cleanupTimer = setInterval(() => {
            purgeExpiredTokens()
                .then(({ refreshTokens, authTokens }) => {
                    if (refreshTokens + authTokens > 0) {
                        console.log(`[manutenção] Removidos ${refreshTokens} tokens de sessão e ${authTokens} tokens de recuperação expirados.`);
                    }
                })
                .catch((error) => console.error('[manutenção] Falha na limpeza de tokens:', error.message));
        }, CLEANUP_INTERVAL_MS);
        cleanupTimer.unref();

        /**
         * Encerramento ordenado.
         *
         * Deixa terminar os pedidos em curso e fecha o pool antes de sair,
         * para que um reinício não corte transações a meio.
         */
        const shutdown = async (signal) => {
            console.log(`[servidor] ${signal} recebido. A encerrar...`);
            clearInterval(cleanupTimer);

            const forceExit = setTimeout(() => {
                console.error('[servidor] Encerramento demorou demasiado. A forçar saída.');
                process.exit(1);
            }, 10000);
            forceExit.unref();

            server.close(async () => {
                try {
                    await closePool();
                } catch (error) {
                    console.error('[servidor] Erro ao fechar o pool:', error.message);
                }
                console.log('[servidor] Encerrado.');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
}

process.on('unhandledRejection', (reason) => {
    console.error('[servidor] Promessa rejeitada sem tratamento:', reason);
});
