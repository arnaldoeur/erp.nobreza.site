# Migrações do Supabase — removidas

A pasta `migrations/` continha 55 ficheiros SQL de Postgres, aplicados à mão
ao longo do tempo. Foram removidos nesta migração porque:

- **Não descreviam um estado reproduzível.** Não havia tabela de controlo de
  migrações, pelo que era impossível saber o que estava aplicado.
- **Tinham números repetidos** — `23_`, `41_`, `42_` e `48_` apareciam duas
  vezes cada, com conteúdos diferentes.
- **Contradiziam-se.** Vários eram correções de emergência que desfaziam o
  ficheiro anterior. A migração 38, por exemplo, desligava o Row Level
  Security nas tabelas de utilizadores e documentos com o comentário
  "temporary to confirm if data exists", e nada a repunha.
- **São Postgres**, e o sistema passou para MySQL. Nem a sintaxe nem os
  conceitos (RLS, `SECURITY DEFINER`, `auth.uid()`) se aplicam.

O estado que descreviam, depurado das contradições, está em
`server/db/migrations/001_baseline.sql` — um único ficheiro determinístico,
com controlo de versão e checksum.

O histórico do Git preserva os ficheiros originais. Para os consultar:

```bash
git log --all --oneline -- migrations/
git show <commit>:migrations/20_NEW_BEGINNING_SETUP.sql
```
