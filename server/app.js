/**
 * Aplicação Express.
 *
 * Monta a API em /api e serve a SPA compilada. O ficheiro está separado do
 * ponto de entrada (`server.js`) para que os testes possam montar a aplicação
 * sem abrir uma porta.
 */

import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createLimiter } from './middleware/rate-limit.js';
import path from 'node:path';
import fs from 'node:fs';

import { config } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { ping } from './db/pool.js';

export function createApp() {
    const app = express();

    // A Hostinger serve a aplicação por trás de um proxy. Sem isto, `req.ip`
    // seria o do proxy e a limitação de frequência aplicar-se-ia a todos os
    // utilizadores em conjunto, em vez de a cada um.
    app.set('trust proxy', 1);
    app.disable('x-powered-by');

    // -------------------------------------------------------------------------
    // Cabeçalhos de segurança
    // -------------------------------------------------------------------------
    // O servidor anterior não enviava nenhum destes.
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                // O Vite injeta estilos em linha; as folhas de estilo externas
                // ficam bloqueadas, que é o que interessa.
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'blob:'],
                fontSrc: ["'self'", 'data:'],
                // A aplicação só fala com a sua própria origem — não há mais
                // nenhum serviço externo a ser chamado a partir do browser,
                // ao contrário do que acontecia com o Supabase e a OpenRouter.
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
            },
        },
        crossOriginEmbedderPolicy: false,
        hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    }));

    app.use(compression());
    app.use(cookieParser());

    // Limite generoso porque logótipos e fotografias de perfil viajam em
    // base64 no corpo do pedido, mas finito para travar pedidos abusivos.
    app.use(express.json({ limit: '8mb' }));
    app.use(express.urlencoded({ extended: true, limit: '2mb' }));

    // -------------------------------------------------------------------------
    // Limite global de frequência
    // -------------------------------------------------------------------------
    // As rotas sensíveis têm limites próprios, mais apertados, definidas em
    // cada router. Este é a rede de segurança para tudo o resto.
    app.use('/api', createLimiter({
        windowMs: 60 * 1000,
        limit: 300,
        message: 'Demasiados pedidos. Aguarde um momento.',
    }));

    // -------------------------------------------------------------------------
    // Verificação de saúde
    // -------------------------------------------------------------------------
    app.get('/api/health', async (_req, res) => {
        try {
            await ping();
            res.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() });
        } catch (error) {
            res.status(503).json({ status: 'degraded', database: 'unreachable', error: error.message });
        }
    });

    app.use('/api', apiRouter);

    // Qualquer rota /api não reconhecida responde 404 em JSON. Sem isto, o
    // fallback da SPA devolveria o index.html e o cliente tentaria interpretar
    // HTML como JSON — o erro mais confuso de diagnosticar que existe.
    app.use('/api', notFoundHandler);

    // -------------------------------------------------------------------------
    // Ficheiros estáticos e SPA
    // -------------------------------------------------------------------------
    const distDir = path.join(config.rootDir, 'dist');
    if (fs.existsSync(distDir)) {
        app.use(express.static(distDir, {
            // Os ficheiros com hash no nome nunca mudam de conteúdo.
            maxAge: config.isProduction ? '1y' : 0,
            index: false,
            setHeaders(res, filePath) {
                // O index.html tem de ser sempre revalidado, senão o browser
                // continua a carregar a versão anterior da aplicação depois
                // de um deploy.
                if (filePath.endsWith('index.html')) {
                    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
                }
            },
        }));

        app.get(/.*/, (_req, res) => {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
            res.sendFile(path.join(distDir, 'index.html'));
        });
    } else {
        app.get(/.*/, (_req, res) => {
            res.status(503).send('A aplicação ainda não foi compilada. Execute: npm run build');
        });
    }

    app.use(errorHandler);

    return app;
}
