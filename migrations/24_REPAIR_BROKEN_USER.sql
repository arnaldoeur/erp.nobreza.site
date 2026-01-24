
-- 24_REPAIR_BROKEN_USER.sql
-- FIX "User Not Found" Error
-- This script manually creates the missing Public Profile for your Auth Account.

DO $$
DECLARE
    v_user_id uuid;
    v_email text := 'arnaldo@farmacianobreza.com'; -- The email from your screenshot
    v_company_id bigint;
BEGIN
    -- 1. Find the Auth User ID (The one that lets you login)
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User % does not exist in Auth. Please Register instead.', v_email;
        RETURN;
    END IF;

    -- 2. Find the Company (It was likely created just before the error)
    -- We grab the latest company created.
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at DESC LIMIT 1;
    
    IF v_company_id IS NULL THEN
         RAISE NOTICE 'No company found. Creating one...';
         INSERT INTO public.companies (name, active) VALUES ('Farmácia Nobreza (Restored)', true) RETURNING id INTO v_company_id;
    END IF;

    -- 3. Insert the missing Public Profile
    INSERT INTO public.users (id, company_id, name, email, role, active)
    VALUES (v_user_id, v_company_id, 'Arnaldo Eurico', v_email, 'ADMIN', true)
    ON CONFLICT (id) DO UPDATE
    SET company_id = v_company_id, active = true; -- Ensure it's active if it existed

    RAISE NOTICE 'SUCCESS: Fixed user % (ID: %) linked to company %', v_email, v_user_id, v_company_id;
END $$;
