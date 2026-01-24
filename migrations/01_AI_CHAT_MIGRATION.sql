-- TABELAS PARA O HISTÓRICO DE IA (INTELLIGENCE HUB) --

-- 1. Tabela de Conversas (Chats)
CREATE TABLE IF NOT EXISTS ai_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid, -- Para isolamento por empresa (opcional, mas recomendado)
    user_id uuid,    -- Quem criou o chat
    module text NOT NULL, -- 'BI', 'DEV', 'VISION'
    title text,
    created_at timestamptz DEFAULT now()
);

-- 2. Tabela de Mensagens
CREATE TABLE IF NOT EXISTS ai_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role text NOT NULL, -- 'user' ou 'assistant'
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Habilitar RLS (Row Level Security) se necessário, por enquanto aberto para teste interno
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Políticas Simples (Permitir tudo para autenticados por enquanto para evitar bloqueios no desenvolvimento)
CREATE POLICY "Permitir acesso total a conversas" ON ai_conversations FOR ALL USING (true);
CREATE POLICY "Permitir acesso total a mensagens" ON ai_messages FOR ALL USING (true);
