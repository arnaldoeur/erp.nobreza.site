-- 47_ACCOUNT_ACTIVATION.sql

-- 1. Alter Chat Members FK to allow cascading updates (so we can change User ID)
ALTER TABLE erp_chat_group_members 
DROP CONSTRAINT IF EXISTS erp_chat_group_members_user_id_fkey;

ALTER TABLE erp_chat_group_members
ADD CONSTRAINT erp_chat_group_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users (id)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- 2. Function to Claim Profile
-- Security Definer allows updating rows even if RLS would block it
create or replace function claim_public_profile(target_email text)
returns boolean
language plpgsql
security definer
as $$
declare
  placeholder_id text;
begin
  -- Find placeholder user by email
  select id into placeholder_id from public.users
  where email = target_email 
  limit 1;

  if placeholder_id is null then
    return false; -- No placeholder found
  end if;

  -- If already match, ignore
  if placeholder_id = auth.uid()::text then
      return true;
  end if;

  -- Update the ID to the current auth.uid()
  -- This will cascade to chat_group_members thanks to ON UPDATE CASCADE
  update public.users
  set id = auth.uid()::text,
      updated_at = now()
  where id = placeholder_id;

  return true;
end;
$$;
