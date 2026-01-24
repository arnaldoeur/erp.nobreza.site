-- =================================================================
-- SCRIPT MESTRE DE BANCO DE DADOS - NOBREZA ERP 2026
-- Execute este script no "SQL Editor" do Supabase para configurar TUDO.
-- =================================================================

-- 1. ADICIONAR COLUNAS DE LOGOTIPO (Se não existirem)
-- A coluna 'logo' original serve como o 'ÍCONE / PRINCIPAL'.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_vertical text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_horizontal text;

-- 2. TABELAS PARA INTELIGÊNCIA ARTIFICIAL (IA)
CREATE TABLE IF NOT EXISTS ai_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,    -- Link para o usuário autenticado
    company_id uuid, -- Link para a empresa
    module text NOT NULL, -- 'BI', 'DEV', 'VISION'
    title text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role text NOT NULL, -- 'user', 'assistant'
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 3. PERMISSÕES (Row Level Security)
-- Garantir acesso a todos os usuários autenticados (simplificado para desenvolvimento)
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir tudo conversations') THEN
        CREATE POLICY "Permitir tudo conversations" ON ai_conversations FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir tudo messages') THEN
        CREATE POLICY "Permitir tudo messages" ON ai_messages FOR ALL USING (true);
    END IF;
END $$;

-- FIM DO SCRIPT
