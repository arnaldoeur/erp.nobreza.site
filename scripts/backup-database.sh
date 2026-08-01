#!/usr/bin/env bash
# =============================================================================
# Cópia de segurança da base de dados
# =============================================================================
#
# O PRD anterior dizia "Databases: Managed by Supabase (Daily Backups)". Ao
# sair do Supabase, essa rede de segurança desaparece — e uma farmácia sem
# cópia do seu histórico de vendas e stock não pode operar depois de um
# incidente.
#
# Este script produz um ficheiro comprimido por execução e apaga os mais
# antigos que o período de retenção.
#
# -----------------------------------------------------------------------------
# Agendar na Hostinger
# -----------------------------------------------------------------------------
# hPanel → Advanced → Cron Jobs. Diariamente às 03:00:
#
#   0 3 * * *  cd ~/domains/app.nobreza.site && bash scripts/backup-database.sh
#
# Depois, verifique periodicamente que os ficheiros estão a ser criados. Uma
# cópia de segurança que nunca foi restaurada é uma suposição, não um plano:
# faça um restauro de teste pelo menos uma vez.
# =============================================================================

set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
    # `set -a` exporta tudo o que for definido a seguir, para que o mysqldump
    # veja as variáveis sem que seja preciso listá-las uma a uma.
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
fi

: "${DB_NAME:?DB_NAME não está definida}"
: "${DB_USER:?DB_USER não está definida}"
: "${DB_HOST:=localhost}"
: "${DB_PORT:=3306}"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup] A exportar ${DB_NAME} de ${DB_HOST}..."

# A palavra-passe vai por variável de ambiente e não por argumento: argumentos
# de linha de comando são visíveis a qualquer utilizador do servidor via `ps`.
MYSQL_PWD="${DB_PASSWORD:-}" mysqldump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --events \
    --default-character-set=utf8mb4 \
    --no-tablespaces \
    "$DB_NAME" | gzip -9 > "$OUTPUT"

# Um dump vazio ou truncado é pior do que nenhum, porque cria uma falsa
# sensação de segurança. Verificamos que o ficheiro tem conteúdo plausível.
SIZE=$(stat -c%s "$OUTPUT" 2>/dev/null || stat -f%z "$OUTPUT")
if [ "$SIZE" -lt 1024 ]; then
    echo "[backup] ERRO: o ficheiro gerado tem apenas ${SIZE} bytes. A exportação falhou."
    rm -f "$OUTPUT"
    exit 1
fi

if ! gzip -t "$OUTPUT" 2>/dev/null; then
    echo "[backup] ERRO: o ficheiro comprimido está corrompido."
    rm -f "$OUTPUT"
    exit 1
fi

echo "[backup] Criado: ${OUTPUT} ($(du -h "$OUTPUT" | cut -f1))"

REMOVED=$(find "$BACKUP_DIR" -name '*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
if [ "$REMOVED" -gt 0 ]; then
    echo "[backup] Removidas ${REMOVED} cópias com mais de ${RETENTION_DAYS} dias."
fi

echo "[backup] Concluído. Cópias disponíveis: $(find "$BACKUP_DIR" -name '*.sql.gz' | wc -l)"
echo
echo "Para restaurar:"
echo "  gunzip -c ${OUTPUT} | mysql -h \$DB_HOST -u \$DB_USER -p \$DB_NAME"
