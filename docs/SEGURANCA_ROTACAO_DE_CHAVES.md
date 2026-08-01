# Rotação de Chaves — Ação Obrigatória

O ficheiro `.env` esteve versionado no Git com credenciais reais de produção.
Todas as chaves abaixo devem ser consideradas **comprometidas** e substituídas.

Remover o ficheiro do repositório não desfaz a exposição: os valores continuam
em commits antigos, em clones que outras pessoas tenham feito, e em qualquer
sistema que tenha indexado o repositório. **A rotação é o único passo que
efetivamente invalida o que já saiu.**

---

## Checklist

| # | Credencial | Onde rotacionar | Estado |
|---|---|---|---|
| 1 | `DATABASE_URL` — password do Postgres Supabase | Supabase → Project Settings → Database → Reset database password | ☐ |
| 2 | `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → Rotate anon key | ☐ |
| 3 | `RESEND_API_KEY` | Resend → API Keys → revogar a antiga e criar nova | ☐ |
| 4 | `VITE_OPENROUTER_API_KEY` | OpenRouter → Keys → revogar e criar nova | ☐ |
| 5 | Chave OpenRouter **escrita no código** (`services/support.service.ts`) | A mesma conta OpenRouter — revogar `sk-or-v1-ab78…` | ☐ |
| 6 | `VITE_CLERK_PUBLISHABLE_KEY` | Clerk → API Keys (chave de teste, e o Clerk nem chega a ser usado no código) | ☐ |

### Notas por item

**1 e 2 — Supabase.** Com a migração para MySQL o projeto Supabase deixa de ser
usado. Ainda assim, rotacione antes de o desativar: enquanto o projeto existir e
a chave for válida, os dados continuam acessíveis a quem tiver a chave. Depois de
a migração estar validada em produção, **apague o projeto Supabase por inteiro** —
é a forma definitiva de fechar o assunto.

**3 — Resend.** A chave estava a ser usada por uma Edge Function sem autenticação
e com CORS aberto, que aceitava remetente e destinatário livres. Qualquer pessoa
na internet podia enviar e-mail em nome de `sistema@nobreza.site`. Além de
rotacionar, **verifique os registos de envio do Resend** à procura de mensagens
que não reconheça. Se o domínio tiver sido usado para envio abusivo, a reputação
de entrega pode estar afetada.

**4 e 5 — OpenRouter.** A chave estava escrita diretamente no ficheiro
`services/support.service.ts`, que é compilado para dentro do JavaScript servido
a qualquer visitante do site. Bastava abrir as ferramentas de programador do
browser para a copiar. **Verifique o consumo faturado da conta.**

**6 — Clerk.** É uma chave de teste (`pk_test_…`) e o pacote `@clerk/clerk-react`
não tem um único import no código. Foi removido das dependências.

---

## Depois de rotacionar

1. Coloque os valores novos **apenas** no painel da Hostinger
   (Websites → Gerir → Node.js → Variáveis de Ambiente) e no `.env` local,
   que agora está no `.gitignore`.
2. Nunca volte a colocar segredos em variáveis com prefixo `VITE_`. Tudo o que
   tem esse prefixo é **injetado no bundle do browser por desenho** e fica
   público. Segredos vivem só no servidor.
3. Para eliminar os valores dos commits antigos, corra
   `scripts/purge-secrets-history.sh` — leia os avisos no topo do ficheiro antes.
