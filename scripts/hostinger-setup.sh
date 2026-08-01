#!/usr/bin/env bash
#
# Preparação da base de dados na Hostinger, a correr por SSH.
#
# Faz três coisas, por esta ordem:
#   1. escreve o .env, se ainda não existir, gerando os segredos no servidor
#   2. aplica as migrações (cria as 34 tabelas)
#   3. cria a empresa e a conta de administrador
#
# É seguro repetir. O .env nunca é substituído, as migrações já aplicadas são
# ignoradas e o seed não faz nada se já existirem dados.
#
# Uso:
#   bash scripts/hostinger-setup.sh
#
set -euo pipefail

DB_NAME_VALUE="u178468876_nobreza_erp_db"
DB_USER_VALUE="u178468876_nobreza_erp_db"
APP_URL_VALUE="https://app.nobreza.site"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# -----------------------------------------------------------------------------
# 1. Localizar a aplicação
# -----------------------------------------------------------------------------
# O deploy da Hostinger coloca o código algures debaixo de ~/domains. Em vez de
# adivinhar o caminho, procuramos o package.json desta aplicação.
say "A localizar a aplicação..."

APP_DIR=""
if [ -f "package.json" ] && grep -q '"nobreza-erp"' package.json 2>/dev/null; then
    APP_DIR="$PWD"
else
    APP_DIR="$(find "$HOME/domains" "$HOME" -maxdepth 5 -name package.json \
        -not -path '*/node_modules/*' 2>/dev/null \
        | xargs grep -l '"nobreza-erp"' 2>/dev/null | head -1 | xargs -r dirname)"
fi

[ -n "$APP_DIR" ] || fail "Não encontrei a aplicação. Entre na pasta do site e corra o script a partir de lá."
cd "$APP_DIR"
echo "  $APP_DIR"

[ -d "server/db/migrations" ] || fail "Esta pasta não tem server/db/migrations. O deploy publicou o branch certo?"

# -----------------------------------------------------------------------------
# 2. Localizar o Node
# -----------------------------------------------------------------------------
# A Hostinger costuma isolar o Node num virtualenv que não está no PATH de uma
# sessão SSH interativa. Se o `node` não aparecer, procuramos o activate.
say "A localizar o Node..."

if ! command -v node >/dev/null 2>&1; then
    ACTIVATE="$(find "$HOME/nodevenv" -maxdepth 4 -name activate 2>/dev/null | head -1)"
    [ -n "$ACTIVATE" ] || fail "Não encontrei o Node. Ative-o no hPanel e volte a correr."
    # shellcheck disable=SC1090
    source "$ACTIVATE"
fi
command -v node >/dev/null 2>&1 || fail "O Node continua indisponível."
echo "  node $(node --version)  ($(command -v node))"

# -----------------------------------------------------------------------------
# 3. Escrever o .env
# -----------------------------------------------------------------------------
# Os segredos são gerados aqui, no servidor, e não passam por mais lado nenhum.
say "Configuração de ambiente..."

if [ -f .env ]; then
    echo "  .env já existe — mantido intacto."
else
    printf 'Password do MySQL (u178468876_nobreza_erp_db): '
    read -rs DB_PASSWORD_VALUE
    printf '\n'
    [ -n "$DB_PASSWORD_VALUE" ] || fail "A password não pode ficar vazia."

    umask 077
    cat > .env <<EOF
NODE_ENV=production
APP_URL=${APP_URL_VALUE}

DB_HOST=localhost
DB_PORT=3306
DB_NAME=${DB_NAME_VALUE}
DB_USER=${DB_USER_VALUE}
DB_PASSWORD='${DB_PASSWORD_VALUE}'
DB_CONNECTION_LIMIT=10

JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n')

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=mail@app.nobreza.site
SMTP_PASSWORD=
MAIL_FROM_NAME=Nobreza ERP
MAIL_FROM_ADDRESS=mail@app.nobreza.site

IMAP_HOST=imap.hostinger.com
IMAP_PORT=993
IMAP_SECURE=true

UPLOAD_DIR=./uploads
UPLOAD_MAX_BYTES=5242880
EOF
    chmod 600 .env
    echo "  .env criado, com segredos gerados no servidor."
fi

mkdir -p uploads

# -----------------------------------------------------------------------------
# 4. Dependências
# -----------------------------------------------------------------------------
if [ ! -d node_modules/mysql2 ]; then
    say "A instalar dependências..."
    npm ci --omit=dev
fi

# -----------------------------------------------------------------------------
# 5. Migrações e seed
# -----------------------------------------------------------------------------
say "A aplicar as migrações..."
npm run db:migrate

say "Estado final das migrações:"
npm run db:migrate -- --status

say "A criar a empresa e o administrador..."
npm run db:seed

say "Concluído."
cat <<'EOF'

Passos que faltam, no hPanel:

  1. Reinicie a aplicação Node para que leia o .env.
  2. Abra https://app.nobreza.site e entre com as credenciais acima.

Guarde já a password do administrador — só é mostrada esta vez.

EOF
