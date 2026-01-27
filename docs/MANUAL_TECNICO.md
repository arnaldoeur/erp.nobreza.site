# MANUAL TÉCNICO - NOBREZA PHARMA

<div align="center">
  <img src="../public/logo-login.png" alt="Tech Stack" width="150" />
</div>

Documentação técnica do sistema de gestão farmacêutica Nobreza ERP.

## 1. Visão Geral
O Nobreza ERP é uma aplicação Web Progressiva (PWA) desenhada para alta disponibilidade em ambientes de farmácia, suportando operação offline e sincronização em nuvem.

## 2. Stack Tecnológica
- **Frontend**: React 18 + TypeScript. Interface otimizada para monitores de balcão.
- **Backend (Baas)**: Supabase (PostgreSQL).
- **Segurança**: RLS (Row Level Security) garante que os dados de cada farmácia (em caso de redes) estejam estritamente isolados.

## 3. Arquitetura de Dados (Farmácia)
A estrutura de dados suporta as especificidades do negócio:

- **`products` (Medicamentos)**:
  - `name`: Nome Comercial/Genérico.
  - `stock_quantity`: Quantidade física.
  - `purchase_price` / `sale_price`: Margens de lucro.
  - *Extensível para*: `expiry_date` (Validade), `batch_number` (Lote), `active_ingredient` (Princípio Ativo).

- **`sales` (Dispensas)**:
  - Registo imutável de transações.
  - Suporte a múltiplos métodos de pagamento (comum em farmácias com convênios).

## 4. Integrações
- **Impressão**: Suporte nativo para impressoras térmicas de talão (comuns em farmácias) e impressoras A4 para relatórios fiscais.
- **Relatórios**: Motor de PDF nativo para geração de mapas de controlo de estupefacientes e vendas diárias.

## 5. Manutenção
- **Updates**: Atualizações automáticas sem paragem da operação de venda ("Zero Downtime Deployment").
- **Backups**: Diários e automáticos na infraestrutura Supabase.

---

**(c) 2026 Zyph Tech, Lda - Engenharia Farmacêutica**
