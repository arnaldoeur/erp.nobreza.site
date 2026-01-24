
-- 15_FIX_CHAT_MESSAGES.sql
-- Fix Missing Table: erp_chat_messages

-- 1. Create Table (if not exists)
CREATE TABLE IF NOT EXISTS public.erp_chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id bigint,  -- Changed to bigint to match companies.id
    grupo_id uuid REFERENCES public.erp_chat_groups(id) ON DELETE CASCADE,
    user_id uuid,
    user_name text,
    content text NOT NULL,
    mentions text[], -- or jsonb, based on usage. usually text[] or jsonb.
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Validar coluna mentions (arrays no Supabase podem ser chatos, vamos garantir que existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'erp_chat_messages' AND column_name = 'mentions') THEN
        ALTER TABLE public.erp_chat_messages ADD COLUMN mentions text[];
    END IF;
END $$;


-- 3. Fix Permissions
GRANT ALL ON TABLE public.erp_chat_messages TO anon, authenticated, service_role;

-- 4. Enable RLS but allow all (for debugging/initial fix)
ALTER TABLE public.erp_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_policy_all" ON public.erp_chat_messages;
CREATE POLICY "messages_policy_all" ON public.erp_chat_messages FOR ALL USING (true);

-- 5. Reload Schema
NOTIFY pgrst, 'reload schema';
