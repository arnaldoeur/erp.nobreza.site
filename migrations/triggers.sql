-- ==================================================
-- AUTOMATIC USER CREATION TRIGGER
-- Run this to fix the "RLS Violation" error forever.
-- ==================================================

-- 1. Create the Function that runs when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, company_id, active)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    'ADMIN', -- First user is always Admin
    (new.raw_user_meta_data->>'company_id')::uuid,
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the Trigger to Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Ensure Companies allow Public Creation (Just in case)
DROP POLICY IF EXISTS "Public Insert Companies" ON companies;
CREATE POLICY "Public Insert Companies" ON companies FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Read Companies" ON companies;
CREATE POLICY "Public Read Companies" ON companies FOR SELECT USING (true);
