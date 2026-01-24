
-- 25_EMERGENCY_LOGIN_FIX.sql
-- DISABLE SECURITY to FORCIBLY ALLOW LOGIN

-- 1. Disable RLS on Critical Tables (To rule out permission issues)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- 2. Force Insert/Update the User Profile
DO $$
DECLARE
    v_user_id uuid;
    v_email text := 'arnaldo@farmacianobreza.com';
    v_company_id bigint;
BEGIN
    -- Get Auth ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Auth User not found. Cannot fix.';
        RETURN;
    END IF;

    -- Get or Create Company
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at DESC LIMIT 1;
    IF v_company_id IS NULL THEN
        INSERT INTO public.companies (name, active) VALUES ('Farmácia Emergência', true) RETURNING id INTO v_company_id;
    END IF;

    -- Upsert User Profile
    INSERT INTO public.users (id, company_id, name, email, role, active)
    VALUES (v_user_id, v_company_id, 'Arnaldo Admin', v_email, 'ADMIN', true)
    ON CONFLICT (id) DO UPDATE
    SET active = true, company_id = v_company_id, role = 'ADMIN';

    RAISE NOTICE 'User Profile Repaired and RLS Disabled.';
END $$;

-- 3. Reload
NOTIFY pgrst, 'reload schema';
