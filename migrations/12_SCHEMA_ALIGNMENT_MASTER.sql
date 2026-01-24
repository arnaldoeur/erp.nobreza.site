-- 12_SCHEMA_ALIGNMENT_MASTER.sql
-- ALINHAMENTO TOTAL DE SCHEMAS (v5.1)
-- FOCO: Forçar Refresh do Cache do Supabase (PostgREST)

-- 1. DESATIVAR RLS TEMPORARIAMENTE
DO $$ 
DECLARE
    t_record RECORD;
BEGIN
    FOR t_record IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t_record.tablename);
    END LOOP;
END $$;

-- 2. LIMPEZA DE POLÍTICAS EXISTENTES
DO $$ 
DECLARE
    pol_record RECORD;
BEGIN
    FOR pol_record IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol_record.policyname, pol_record.schemaname, pol_record.tablename);
    END LOOP;
END $$;

-- 3. DROP DE TABELAS MODULARES PARA REALINHAMENTO
-- Nomes padronizados em Inglês
DROP TABLE IF EXISTS public.erp_chat_messages CASCADE;
DROP TABLE IF EXISTS public.erp_chat_groups CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;

-- 4. REPARAÇÃO ESTRUTURAL DA TABELA COMPANIES
CREATE TABLE IF NOT EXISTS public.companies (
    name text NOT NULL DEFAULT 'Nova Farmácia',
    active boolean DEFAULT true,
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);

DO $$ 
BEGIN
    -- ACTIVE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'active') THEN
        ALTER TABLE public.companies ADD COLUMN active boolean DEFAULT true;
    END IF;

    -- THEME_COLOR
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'theme_color') THEN
        ALTER TABLE public.companies ADD COLUMN theme_color text DEFAULT '#10b981';
    END IF;
    
    -- CONTACT
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'contact') THEN
        ALTER TABLE public.companies ADD COLUMN contact text;
    END IF;
END $$;

-- 5. REPARAÇÃO DA TABELA USERS
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id bigint,
    name text,
    email text,
    role text DEFAULT 'USER',
    photo text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- Forçar tipo BIGINT
ALTER TABLE public.users ALTER COLUMN company_id TYPE bigint USING company_id::bigint;

-- 6. RECRIAR TABELAS MODULARES (INGLÊS)
CREATE TABLE public.erp_chat_groups (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.erp_chat_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    grupo_id uuid REFERENCES public.erp_chat_groups(id) ON DELETE CASCADE,
    user_id uuid,
    user_name text,
    content text NOT NULL,
    mentions uuid[],
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL,
    assigned_to uuid,
    title text NOT NULL,
    description text,
    status text DEFAULT 'PENDING',
    priority text DEFAULT 'MEDIUM',
    due_date date,
    location text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.documents (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    type text NOT NULL,
    customer_name text,
    total numeric(20,2) DEFAULT 0,
    status text DEFAULT 'SENT',
    items jsonb DEFAULT '[]'::jsonb,
    created_by text,
    date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.support_tickets (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id bigint REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id uuid,
    subject text NOT NULL,
    description text,
    priority text DEFAULT 'MEDIUM',
    status text DEFAULT 'OPEN',
    created_at timestamp with time zone DEFAULT now()
);

-- 7. FUNÇÃO DE SEGURANÇA (ID BIGINT)
CREATE OR REPLACE FUNCTION public.get_company_id_safe()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- 8. REATIVAR RLS COM ISOLAMENTO
DO $$ 
DECLARE
    t_name text;
BEGIN
    FOR t_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'company_id') THEN
            EXECUTE format('CREATE POLICY "COMPANY_ISOLATION" ON public.%I FOR ALL USING (company_id = get_company_id_safe())', t_name);
        ELSE
            EXECUTE format('CREATE POLICY "NO_ISOLATION_DEBUG" ON public.%I FOR ALL USING (true)', t_name);
        END IF;
    END LOOP;
END $$;

-- 9. SEED
INSERT INTO public.companies (name, active) 
SELECT 'Farmácia Nobreza', true 
WHERE NOT EXISTS (SELECT 1 FROM public.companies LIMIT 1);

-- 10. TRIGGER DE REFRESH AUTOMÁTICO (Caso o NOTIFY fale)
COMMENT ON TABLE public.erp_chat_groups IS 'Refreshed at: ' || now();
COMMENT ON TABLE public.erp_chat_messages IS 'Refreshed at: ' || now();
COMMENT ON TABLE public.tasks IS 'Refreshed at: ' || now();
COMMENT ON TABLE public.documents IS 'Refreshed at: ' || now();

-- PERMISSÕES
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- FORCE POSTGREST RELOAD
NOTIFY pgrst, 'reload schema';
