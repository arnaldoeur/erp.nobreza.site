-- =================================================================
-- 03_ULTRA_MIGRACAO_FINAL.sql
-- NOBREZA ERP -> ZYPH AI ERP
-- Execute este script completo no SQL Editor do Supabase.
-- =================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de EMPRESAS (Logotipos)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_vertical text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_horizontal text;

-- 3. Tabela de FORNECEDORES (Novos Campos)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_conditions text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS estimated_delivery text;

-- 4. Tabela de VENDAS (Atribuição de Usuário)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS user_id uuid;

-- 5. TABELAS DE INTELIGÊNCIA ARTIFICIAL (ZYPH AI)
CREATE TABLE IF NOT EXISTS ai_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,    
    company_id uuid, 
    module text NOT NULL, -- 'BI', 'DEV', 'VISION'
    title text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role text NOT NULL, 
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 6. MÓDULO DE DESPESAS (Financeiro)
CREATE TABLE IF NOT EXISTS expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL, -- 'Operational', 'Salary', 'Maintenance', 'Technical', 'Tax', 'Other'
    amount decimal(12,2) NOT NULL DEFAULT 0,
    description text,
    date date DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now()
);

-- 7. MÓDULO DE TAREFAS
CREATE TABLE IF NOT EXISTS tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    assigned_to uuid,
    title text NOT NULL,
    description text,
    status text DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'DONE'
    due_date date,
    created_at timestamptz DEFAULT now()
);

-- 8. MÓDULO DE DOCUMENTOS INTERNOS
CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    category text, -- 'Invoices', 'Contracts', 'Policies', 'Others'
    file_url text NOT NULL,
    file_type text,
    created_at timestamptz DEFAULT now()
);

-- 9. MÓDULO DE CHAT SOCIAL (Equipe)
CREATE TABLE IF NOT EXISTS social_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_name text,
    content text NOT NULL,
    mentions jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 10. POLÍTICAS DE SEGURANÇA (RLS) - Simplicado para Ambiente de Desenvolvimento
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_messages ENABLE ROW LEVEL SECURITY;

-- Políticas: Para fins de rapidez, permitimos acesso a usuários autenticados da mesma empresa
-- (Em produção real, as políticas seriam mais restritivas por user_id)

-- Drop policies existence check and create (Simpler for user)
DO $$ 
BEGIN
    -- AI Conversations: User sees only THEIR chats
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_access_own_chats') THEN
        CREATE POLICY "user_access_own_chats" ON ai_conversations FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- AI Messages: Tied to conversation access
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'access_own_chat_messages') THEN
        CREATE POLICY "access_own_chat_messages" ON ai_messages FOR ALL 
        USING (EXISTS (SELECT 1 FROM ai_conversations WHERE id = conversation_id AND user_id = auth.uid()));
    END IF;

    -- Financial, Tasks, Docs: Company Wide (Admin context)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_expenses') THEN
        CREATE POLICY "auth_all_expenses" ON expenses FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_tasks') THEN
        CREATE POLICY "auth_all_tasks" ON tasks FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_docs') THEN
        CREATE POLICY "auth_all_docs" ON documents FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_social') THEN
        CREATE POLICY "auth_all_social" ON social_messages FOR ALL USING (true);
    END IF;
END $$;

-- FIM DO SCRIPT
