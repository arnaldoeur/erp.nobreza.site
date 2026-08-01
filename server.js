/**
 * Ponto de entrada da aplicação.
 *
 * É o ficheiro que a Hostinger arranca (hPanel → Node.js → Startup File).
 *
 * Antes, este ficheiro apenas servia os ficheiros estáticos da pasta `dist`:
 * o "backend" real era o Supabase, contactado diretamente pelo browser. Agora
 * é aqui que vive a API, e o browser não fala com mais nada.
 */

import { config } from './server/config/env.js';
import { createApp } from './server/app.js';
import { ping, closePool } from './server/db/pool.js';
import { purgeExpiredTokens } from './server/services/auth.service.js';

const app = createApp();

/**
 * Confirma a ligação à base de dados antes de aceitar tráfego.
 *
 * Falhar aqui, e em voz alta, é melhor do que arrancar e devolver erros 500 a
 * cada pedido sem que ninguém perceba porquê.
 */
try {
    await ping();
    console.log(`[servidor] Ligado à base de dados ${config.db.database} em ${config.db.host}`);
} catch (error) {
    console.error('[servidor] Não foi possível ligar à base de dados:', error.message);
    console.error('[servidor] Verifique DB_HOST, DB_NAME, DB_USER e DB_PASSWORD.');
    process.exit(1);
}

const server = app.listen(config.port, () => {
    console.log(`[servidor] Nobreza ERP a escutar na porta ${config.port} (${config.env})`);
});

/**
 * Limpeza periódica de tokens expirados.
 *
 * `unref()` para que este temporizador não impeça o processo de terminar
 * quando lhe for pedido que encerre.
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
 * Deixa terminar os pedidos em curso e fecha o pool antes de sair, para que
 * um reinício não corte transações a meio.
 */
async function shutdown(signal) {
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
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
    console.error('[servidor] Promessa rejeitada sem tratamento:', reason);
});
