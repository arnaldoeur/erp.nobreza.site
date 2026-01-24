-- 06_REPARAR_ZYPH_AI.sql
-- DEFINITIVE FIX FOR SCHEMA CACHE

-- 1. Reset explicit permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- 2. Drop and recreate to force a DDL event that PostgREST MUST catch
DROP TABLE IF EXISTS public.zyph_messages CASCADE;
DROP TABLE IF EXISTS public.zyph_conversations CASCADE;

-- 3. Recreate with explicit schema and ownership
CREATE TABLE public.zyph_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,    
    company_id uuid, 
    module text NOT NULL, 
    title text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.zyph_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.zyph_conversations(id) ON DELETE CASCADE,
    role text NOT NULL, 
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 4. Enable RLS and Force Ownership to active role
ALTER TABLE public.zyph_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zyph_messages ENABLE ROW LEVEL SECURITY;

-- 5. Create "Bypass" Policies for Development
CREATE POLICY "dev_all_conv" ON public.zyph_conversations FOR ALL TO public USING (true);
CREATE POLICY "dev_all_msg" ON public.zyph_messages FOR ALL TO public USING (true);

-- 6. Explicit Grants for all possible roles
GRANT ALL ON TABLE public.zyph_conversations TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.zyph_messages TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 7. THE TICKLE: Add and remove a dummy column to trigger a schema change event
ALTER TABLE public.zyph_conversations ADD COLUMN _refresh_cache boolean;
ALTER TABLE public.zyph_conversations DROP COLUMN _refresh_cache;

-- 8. THE NOTIFY (Reload PostgREST signal)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';