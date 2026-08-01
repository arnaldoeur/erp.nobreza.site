/**
 * Agregador das rotas da API.
 *
 * Tudo o que está abaixo de `/api` passa por aqui. A única rota pública é a
 * de autenticação — todas as outras exigem sessão, aplicada pelo
 * `requireAuth` no topo de cada router.
 */

import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { catalogRouter } from './catalog.routes.js';
import { salesRouter } from './sales.routes.js';
import { financeRouter } from './finance.routes.js';
import { companyRouter } from './company.routes.js';
import { collabRouter } from './collab.routes.js';
import { systemRouter } from './system.routes.js';
import { documentsRouter } from './documents.routes.js';
import { supportRouter } from './support.routes.js';
import { emailRouter } from './email.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);

apiRouter.use(catalogRouter);   // produtos, fornecedores, clientes
apiRouter.use(salesRouter);     // vendas e documentos de faturação
apiRouter.use(financeRouter);   // despesas, fechos, planos de saúde, relatórios
apiRouter.use(companyRouter);   // empresa, equipa, perfil, turnos
apiRouter.use(collabRouter);    // tarefas, conversas, calendário
apiRouter.use(systemRouter);    // registo de atividade, notificações, plataforma
apiRouter.use(documentsRouter); // biblioteca de ficheiros
apiRouter.use(supportRouter);   // pedidos de assistência e assistente de IA
apiRouter.use(emailRouter);     // contas de e-mail, envio, domínios
