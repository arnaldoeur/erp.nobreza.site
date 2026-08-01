# Executar o Nobreza ERP no seu computador

Serve para trabalhar no sistema sem depender do alojamento — para desenvolver,
para demonstrar, ou para confirmar que um problema está no servidor e não na
aplicação.

Tudo corre num único endereço, `http://localhost:3001`: o Express serve a API
e também a aplicação compilada. Não é preciso arrancar dois processos.

## Antes de começar

Precisa do **Node.js 20 ou superior**. Confirme com:

```
node --version
```

Se não o tiver, instale a versão LTS a partir de nodejs.org.

## 1. Obter o código

```
git clone https://github.com/arnaldoeur/erp.nobreza.site.git
cd erp.nobreza.site
npm install
```

## 2. Configurar o ambiente

Crie um ficheiro chamado `.env` na raiz do projeto. Repare no ponto inicial —
o nome é mesmo `.env`, sem nada antes.

O conteúdo depende da base de dados que quiser usar.

### Opção A — contra a base de dados da Hostinger

É a mais rápida: os dados já lá estão. Exige que o *Remote MySQL* esteja
ativo no painel para o seu IP (ou para `%`).

```
NODE_ENV=development
APP_URL=http://localhost:3001
PORT=3001

DB_HOST=srv2104.hstgr.io
DB_PORT=3306
DB_NAME=u178468876_nobreza_erp_db
DB_USER=u178468876_nobreza_erp_db
DB_PASSWORD=<a password do MySQL>

JWT_SECRET=<32+ caracteres>
JWT_REFRESH_SECRET=<32+ caracteres, diferentes>
ENCRYPTION_KEY=<32 bytes em base64>
```

> **A `ENCRYPTION_KEY` tem de ser a mesma** que está no painel de alojamento.
> É com ela que as credenciais de e-mail guardadas na base de dados foram
> cifradas; com outra chave, deixam de poder ser lidas.

### Opção B — com uma base de dados local

Preferível para experimentar à vontade, sem tocar em dados reais. Requer
MySQL 8 ou MariaDB 10.6+ instalado.

```
NODE_ENV=development
APP_URL=http://localhost:3001
PORT=3001

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=nobreza_local
DB_USER=nobreza
DB_PASSWORD=<a que definir>

JWT_SECRET=<32+ caracteres>
JWT_REFRESH_SECRET=<32+ caracteres, diferentes>
ENCRYPTION_KEY=<32 bytes em base64>

SEED_ADMIN_EMAIL=admin@nobreza.site
SEED_ADMIN_PASSWORD=<a que quiser>
```

Crie a base de dados e prepare-a:

```
npm run db:migrate
npm run db:seed
```

### Porque é que aqui o NODE_ENV é development

Em `production`, os cookies de sessão levam a marca `Secure` e o browser só
os aceita sobre HTTPS. Localmente o endereço é `http://`, portanto o login
pareceria funcionar e a sessão perdia-se no pedido seguinte. Ver
`server/middleware/auth.js`, em `cookieOptions`.

## 3. Compilar e arrancar

```
npm run build
npm start
```

Abra **http://localhost:3001**.

No arranque, o terminal confirma o estado:

```
[servidor] Ligado à base de dados nobreza_local em 127.0.0.1
[servidor] Nobreza ERP a escutar na porta 3001 (development)
```

Se em vez disso aparecer uma lista de variáveis em falta, ou um erro de
ligação, o servidor arranca à mesma em modo de diagnóstico e explica no
browser o que corrigir.

## Verificar que está tudo bem

```
curl http://localhost:3001/api/health
```

Deve responder `{"status":"ok","database":"ok"}`.

## Durante o desenvolvimento

O comando acima compila uma vez. Para ver as alterações do frontend sem
recompilar de cada vez, use dois terminais:

```
npm run dev        # interface, com recarregamento automático
npm run dev:api    # API, reinicia quando o código do servidor muda
```

E antes de enviar alterações:

```
npm run typecheck
npm test
```
