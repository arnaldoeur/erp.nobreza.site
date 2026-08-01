# Nobreza ERP

Sistema de gestão para farmácias. React + Vite no frontend, API Node/Express
sobre MySQL, alojado na Hostinger em `app.nobreza.site`.

## Arquitetura

```
Browser (React SPA)
   │  fetch /api/*  — cookie httpOnly, sem chaves no bundle
   ▼
Express (server.js)
   ├─ auth      bcrypt + JWT + recuperação de palavra-passe por token
   ├─ tenant    company_id vem do token assinado, nunca do cliente
   ├─ rbac      permissões verificadas no servidor
   ├─ e-mail    SMTP com remetente fixo
   └─ uploads   disco, servidos por rota autenticada
   ▼
MySQL / MariaDB — pool mysql2, queries parametrizadas, transações
```

O browser não fala com a base de dados. Toda a autorização acontece no
servidor.

## Arrancar localmente

```bash
npm install
cp .env.example .env        # preencher a ligação à base de dados e os segredos
npm run db:migrate          # criar o schema
npm run db:seed             # criar a empresa e o administrador inicial

npm run dev                 # frontend, porta 3000
npm run dev:api             # API, porta 3001
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Frontend em modo de desenvolvimento |
| `npm run dev:api` | API com recarregamento automático |
| `npm run build` | Compila o frontend para `dist/` |
| `npm start` | Servidor de produção (API + `dist`) |
| `npm test` | Testes: unidade e integração da API |
| `npm run typecheck` | Verificação de tipos |
| `npm run db:migrate` | Aplica as migrações pendentes |
| `npm run db:seed` | Cria a empresa e o administrador inicial |
| `npm run db:backup` | Cópia de segurança da base de dados |

Os testes de integração precisam de uma base de dados acessível. Sem ela são
ignorados em vez de falharem.

## Estrutura

```
server/                API Node/Express
  config/env.js        configuração validada no arranque
  db/                  pool, migrações e semente
  middleware/          autenticação, tenant, RBAC, erros, limites
  routes/              rotas REST por módulo
  services/            autenticação, e-mail, registo de atividade
  tests/               testes de integração
services/              serviços do frontend (cliente da API)
components/            interface React
docs/                  deploy, segurança e manuais
```

## Documentação

- **[Deploy na Hostinger](docs/DEPLOY_HOSTINGER.md)** — instalação passo a passo
- **[Rotação de chaves](docs/SEGURANCA_ROTACAO_DE_CHAVES.md)** — ação obrigatória
- [Manual do utilizador](docs/MANUAL_DO_UTILIZADOR.md)
- [Manual técnico](docs/MANUAL_TECNICO.md)

## Segurança

Regras que não têm exceção neste código:

1. **Nenhum segredo no frontend.** Tudo com prefixo `VITE_` vai para dentro do
   bundle do browser por desenho, e fica público.
2. **O `company_id` vem sempre do token**, nunca do corpo do pedido, dos
   parâmetros ou do localStorage.
3. **Valores sempre por placeholders** nas consultas SQL. Nomes de tabela e
   coluna são literais no código.
4. **Operações que tocam em stock ou dinheiro correm em transação.**
5. **Preços vêm da base de dados**, nunca do pedido do cliente.

---

Desenvolvido por Zyph Tech, Lda — Niassa, Moçambique.
