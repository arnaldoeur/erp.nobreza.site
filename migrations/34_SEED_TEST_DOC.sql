
-- 34_SEED_TEST_DOC.sql
-- Manually insert a document to verify visibility (Fixed Syntax)

DO $$ 
DECLARE
    v_company_id bigint;
    v_user_id uuid;
BEGIN
    -- 1. Try to get current user info
    SELECT id, company_id INTO v_user_id, v_company_id
    FROM public.users 
    WHERE id = auth.uid() 
    LIMIT 1;

    -- 2. If no user found (maybe running as anon in editor?), get first company
    IF v_company_id IS NULL THEN
        SELECT id INTO v_company_id FROM public.companies LIMIT 1;
    END IF;

    -- 3. Insert the test document
    INSERT INTO public.documents (
        company_id,
        user_id,
        name,
        category,
        file_url,
        file_type
    ) VALUES (
        v_company_id,
        v_user_id, -- Can be NULL if not found, that's fine
        'TESTE_MANUAL_SQL.pdf',
        'Outros',
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        'application/pdf'
    );
    
END $$;
