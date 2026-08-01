# Deploy na Hostinger — app.nobreza.site

Guia completo para pôr o Nobreza ERP a correr. Siga pela ordem indicada: cada
passo depende do anterior.

---

## 0. Antes de tudo — verificar a exposição do código-fonte

O deploy anterior copiava **o repositório inteiro** para `public_html`. Isso
significa que ficheiros que só deviam existir no servidor estiveram acessíveis
na web. Abra no browser:

```
https://app.nobreza.site/.env
https://app.nobreza.site/services/support.service.ts
```

Se algum destes descarregar ou mostrar conteúdo, as credenciais que continham
estiveram públicas. **Rotacione tudo antes de continuar** — a lista está em
`docs/SEGURANCA_ROTACAO_DE_CHAVES.md`.

O passo 5 deste guia corrige a causa: passa a publicar apenas a aplicação
compilada, sem código-fonte.

---

## 1. Base de dados MySQL

hPanel → **Bases de Dados → MySQL**.

1. Crie a base de dados e o utilizador (a Hostinger prefixa ambos com o número
   da conta).
2. Dê ao utilizador **todos os privilégios** sobre a base de dados.
3. Anote o nome, o utilizador e a palavra-passe — vão para as variáveis de
   ambiente no passo 3.

**Sobre o `DB_HOST`:**

| Valor | Quando usar |
|---|---|
| `localhost` | A aplicação Node corre na mesma conta Hostinger. **Prefira esta**: é mais rápida e não exige configuração adicional. |
| `app.nobreza.site` | Ligação a partir de outro servidor. Exige ativar **MySQL Remoto** no hPanel e autorizar lá o IP de origem. |

---

## 2. Node.js

hPanel → **Advanced → Node.js** (ou **Website → Node.js**, conforme o plano).

| Campo | Valor |
|---|---|
| Versão do Node | 20 ou superior |
| Ficheiro de arranque | `server.js` |
| Modo | Production |

Se esta secção não existir no seu plano, o alojamento é só PHP e a API em
Node não pode correr — nesse caso o backend tem de ser reimplementado em PHP,
ou a aplicação passa para um VPS.

---

## 3. Variáveis de ambiente

No painel de Node.js, secção **Environment Variables**. Use o
`.env.example` como referência — ele lista todas as variáveis com explicação.

**Obrigatórias.** O servidor recusa arrancar sem elas, com uma mensagem a
dizer o que falta:

```
NODE_ENV=production
APP_URL=https://app.nobreza.site

DB_HOST=localhost
DB_NAME=<nome da base de dados>
DB_USER=<utilizador>
DB_PASSWORD=<palavra-passe>

JWT_SECRET=<gerar>
JWT_REFRESH_SECRET=<gerar, diferente do anterior>
ENCRYPTION_KEY=<gerar>

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=mail@app.nobreza.site
SMTP_PASSWORD=<palavra-passe da conta de e-mail>
MAIL_FROM_ADDRESS=mail@app.nobreza.site
```

Gere os segredos com:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET
openssl rand -base64 32   # ENCRYPTION_KEY — tem de dar exatamente 32 bytes
```

> **`ENCRYPTION_KEY` não pode mudar depois de o sistema estar em uso.** É com
> ela que as credenciais SMTP e IMAP guardadas na base de dados são cifradas.
> Trocá-la torna-as ilegíveis e as contas de e-mail deixam de funcionar.

---

## 4. Configuração de e-mail

Os valores da conta `mail@app.nobreza.site`:

| | Servidor | Porta | Segurança |
|---|---|---|---|
| Envio (SMTP) | `smtp.hostinger.com` | 465 | SSL |
| Receção (IMAP) | `imap.hostinger.com` | 993 | SSL |
| Receção (POP3) | `pop.hostinger.com` | 995 | SSL |

Para que os clientes de e-mail detetem estas definições sozinhos, acrescente
em **Domínios → DNS Zone Editor**:

| Tipo | Nome | Aponta para | TTL |
|---|---|---|---|
| CNAME | `autodiscover` | `autodiscover.mail.hostinger.com` | 300 |
| CNAME | `autoconfig` | `autoconfig.mail.hostinger.com` | 300 |

O `MAIL_FROM_ADDRESS` é o **único** remetente que o sistema usa. O cliente
nunca o escolhe — foi essa liberdade que tornou o mecanismo anterior um relay
aberto para o domínio.

---

## 5. Publicação por Git

O deploy por Git da Hostinger faz apenas `git pull`; **não corre
`npm run build`**. Publicar o branch `main` diretamente coloca o código-fonte
na raiz do site sem sequer produzir a aplicação compilada.

A solução está em `.github/workflows/deploy.yml`: a cada push para `main`, o
GitHub Actions compila e publica num branch `deploy` que contém só o
necessário para correr.

**Configuração:**

1. hPanel → **Advanced → GIT**.
2. Altere o branch de `main` para **`deploy`**.
3. Aguarde a primeira execução do workflow (separador *Actions* no GitHub).
4. Carregue em **Redeploy**.

O que fica no servidor: `dist/`, `server/`, `server.js`, `package.json`,
`scripts/`. O que **não** fica: `App.tsx`, `components/`, `services/`,
`contexts/`, `utils/`, testes e configuração de build.

---

## 6. Dependências e base de dados

Por SSH (hPanel → Advanced → SSH Access), na pasta da aplicação:

```bash
npm ci --omit=dev      # instalar dependências de produção
npm run db:migrate     # criar as 34 tabelas
npm run db:seed        # criar a empresa e o administrador inicial
```

O `db:seed` imprime a palavra-passe do administrador **uma única vez**.
Guarde-a nesse momento: não fica gravada em lado nenhum, a base de dados só
tem o hash.

Para escolher os valores em vez de os deixar ao acaso:

```bash
SEED_COMPANY_NAME="Farmácia Nobreza" \
SEED_ADMIN_EMAIL="admin@app.nobreza.site" \
SEED_ADMIN_PASSWORD="<a sua escolha>" \
npm run db:seed
```

O `db:migrate` é seguro de repetir: só aplica o que falta, e recusa reaplicar
um ficheiro que tenha sido alterado depois de aplicado.

---

## 7. Arrancar e verificar

Reinicie a aplicação no painel de Node.js e confirme:

```bash
curl https://app.nobreza.site/api/health
```

Resposta esperada:

```json
{"status":"ok","database":"ok","timestamp":"..."}
```

Se `database` vier `unreachable`, o problema está nas variáveis de ligação ou,
com `DB_HOST` remoto, na autorização de IP do MySQL Remoto.

**Lista de verificação funcional:**

- [ ] Iniciar sessão com a conta de administrador
- [ ] Criar um produto e confirmar que aparece no stock
- [ ] Registar uma venda no POS e confirmar que o stock **desce**
- [ ] Tentar vender mais unidades do que existem — deve ser recusado
- [ ] Emitir uma fatura e confirmar a numeração sequencial
- [ ] Adicionar um membro à equipa e confirmar que recebe o convite por e-mail
- [ ] Usar "Esqueci a palavra-passe" e completar o fluxo até ao fim
- [ ] Fechar a caixa e confirmar o cálculo da diferença

---

## 8. Cópias de segurança

Ao sair do Supabase, os backups automáticos deixam de existir. Agende em
hPanel → **Advanced → Cron Jobs**:

```
0 3 * * *  cd ~/domains/app.nobreza.site && bash scripts/backup-database.sh
```

Guarda um ficheiro comprimido por dia, com 14 dias de retenção (configurável
em `BACKUP_RETENTION_DAYS`).

> Faça um restauro de teste. Uma cópia de segurança que nunca foi restaurada é
> uma suposição, não um plano.

---

## 9. Depois de estar a funcionar

1. **Rotacionar as chaves** — `docs/SEGURANCA_ROTACAO_DE_CHAVES.md`.
2. **Apagar o projeto Supabase**, depois de confirmar que o sistema novo está
   estável. Enquanto existir, os dados antigos continuam acessíveis a quem
   tiver as chaves.
3. **Trocar as palavras-passe partilhadas por chat** — a da base de dados e a
   da conta de e-mail.

---

## Resolução de problemas

| Sintoma | Causa provável |
|---|---|
| A aplicação não arranca e os registos mostram uma lista de variáveis | Falta configuração obrigatória. A mensagem diz exatamente quais. |
| `ENCRYPTION_KEY tem de descodificar para 32 bytes` | A chave foi gerada com o comando errado. Use `openssl rand -base64 32`. |
| `/api/health` responde `database: unreachable` | Credenciais erradas, ou IP não autorizado no MySQL Remoto. |
| Página em branco, consola com erro de módulo | O `dist` não foi publicado. Verifique se o branch de deploy é `deploy` e se o workflow correu. |
| Pedidos à API devolvem HTML em vez de JSON | A aplicação Node não está a correr; o Apache está a servir a pasta diretamente. |
| E-mails não chegam | `SMTP_PASSWORD` errada, ou porta bloqueada. Teste em Definições → E-mail → Testar ligação. |
| "Sessão expirada" a toda a hora | `JWT_SECRET` muda a cada reinício, ou a aplicação corre em várias instâncias com segredos diferentes. |
