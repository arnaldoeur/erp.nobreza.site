#!/usr/bin/env bash
# =============================================================================
# Purga do ficheiro .env do histórico completo do Git
# =============================================================================
#
# O `.env` deste repositório foi versionado com segredos reais de produção.
# Removê-lo do índice (já feito) impede novas exposições, mas os valores
# continuam legíveis em qualquer commit antigo. Este script reescreve o
# histórico para os eliminar.
#
#   >>> ISTO NÃO SUBSTITUI A ROTAÇÃO DAS CHAVES. <<<
#
# Qualquer pessoa que tenha clonado o repositório, ou qualquer sistema que o
# tenha indexado, já possui os valores antigos. A reescrita do histórico
# fecha a porta; a rotação é o que invalida o que já saiu por ela.
# Consulte docs/SEGURANCA_ROTACAO_DE_CHAVES.md para a lista de chaves.
#
# -----------------------------------------------------------------------------
# CONSEQUÊNCIAS — leia antes de executar
# -----------------------------------------------------------------------------
#  1. Todos os SHAs de commit mudam. O histórico passa a ser incompatível
#     com o remoto atual e exige `push --force`.
#  2. Todos os clones locais existentes ficam órfãos. Cada pessoa da equipa
#     tem de apagar o seu clone e clonar de novo. Trabalho não enviado
#     perde-se se não for guardado antes.
#  3. Pull requests abertos contra os branches reescritos podem partir-se.
#  4. Não é reversível depois do force-push.
#
# Faça isto com a equipa avisada e sem trabalho por enviar.
#
# -----------------------------------------------------------------------------
# UTILIZAÇÃO
# -----------------------------------------------------------------------------
#   1. Instalar a ferramenta:   pip install git-filter-repo
#   2. Clone fresco e dedicado: git clone <url> erp-purge && cd erp-purge
#   3. Executar:                bash scripts/purge-secrets-history.sh
#   4. Rever o resultado, depois enviar:
#        git push --force --all
#        git push --force --tags
#   5. Avisar a equipa para reclonar.
# =============================================================================

set -euo pipefail

RED=$'\033[0;31m'; YELLOW=$'\033[1;33m'; GREEN=$'\033[0;32m'; NC=$'\033[0m'

echo "${YELLOW}=== Purga de segredos do histórico do Git ===${NC}"
echo

if ! command -v git-filter-repo >/dev/null 2>&1; then
    echo "${RED}git-filter-repo não encontrado.${NC}"
    echo "Instale com:  pip install git-filter-repo"
    exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
    echo "${RED}A árvore de trabalho tem alterações por confirmar.${NC}"
    echo "Confirme ou descarte tudo antes de reescrever o histórico."
    exit 1
fi

echo "Repositório: $(git rev-parse --show-toplevel)"
echo "Commits que serão reescritos: $(git rev-list --all --count)"
echo
echo "${RED}Isto reescreve TODO o histórico e obriga a force-push.${NC}"
echo "${RED}Todos os clones existentes ficarão inutilizáveis.${NC}"
echo
read -r -p "Escreva PURGAR para continuar: " confirm
if [ "$confirm" != "PURGAR" ]; then
    echo "Cancelado."
    exit 0
fi

echo
echo "A remover .env de todo o histórico..."
git filter-repo --force --invert-paths \
    --path .env \
    --path .env.local \
    --path .env.production \
    --path .env.development

echo
echo "A verificar..."
if git log --all --oneline -- .env 2>/dev/null | grep -q .; then
    echo "${RED}FALHOU: ainda existem commits que tocam em .env.${NC}"
    exit 1
fi
echo "${GREEN}.env já não existe em nenhum commit.${NC}"

echo
echo "${YELLOW}Passos seguintes (manuais, por segurança):${NC}"
echo "  1. git remote add origin <url>        # o filter-repo remove o remoto"
echo "  2. git push --force --all"
echo "  3. git push --force --tags"
echo "  4. Avisar a equipa para reclonar o repositório"
echo "  5. ${RED}Rotacionar TODAS as chaves${NC} — ver docs/SEGURANCA_ROTACAO_DE_CHAVES.md"
