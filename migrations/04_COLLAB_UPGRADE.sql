-- =================================================================
-- 04_COLLAB_UPGRADE.sql
-- NOBREZA ERP -> Advanced Collaboration (Phase 3)
-- =================================================================

-- 1. EXTENSÕES PARA TAREFAS
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'MEDIUM'; -- 'LOW', 'MEDIUM', 'HIGH'
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE tasks RENAME COLUMN status TO old_status;
ALTER TABLE tasks ADD COLUMN status text DEFAULT 'PENDING'; -- 'PENDING', 'PROGRESS', 'DONE'
UPDATE tasks SET status = old_status WHERE old_status IS NOT EXISTS; -- Transition check
ALTER TABLE tasks DROP COLUMN IF EXISTS old_status;

-- 2. GRUPOS DE CHAT
CREATE TABLE IF NOT EXISTS social_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Insert a default "Geral" group for each existing company
INSERT INTO social_groups (company_id, name)
SELECT id, 'Geral' FROM companies
ON CONFLICT DO NOTHING;

-- 3. UPGRADE DE MENSAGENS SOCIAIS
ALTER TABLE social_messages ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES social_groups(id) ON DELETE CASCADE;

-- Update existing messages to belong to the "Geral" group
UPDATE social_messages m
SET group_id = g.id
FROM social_groups g
WHERE m.company_id = g.company_id AND g.name = 'Geral' AND m.group_id IS NULL;

-- 4. MÓDULO DE SUPORTE (TICKETS)
CREATE TABLE IF NOT EXISTS support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    subject text NOT NULL,
    description text,
    status text DEFAULT 'OPEN', -- 'OPEN', 'IN_ANALYSIS', 'RESOLVED', 'CLOSED'
    priority text DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    created_at timestamptz DEFAULT now()
);

-- 5. RLS POLICIES (Simplicado)
ALTER TABLE social_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_groups') THEN
        CREATE POLICY "auth_all_groups" ON social_groups FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_support') THEN
        CREATE POLICY "auth_all_support" ON support_tickets FOR ALL USING (true);
    END IF;
END $$;
