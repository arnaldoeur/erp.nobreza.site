-- 45_FIX_RECURSION_FINAL.sql

-- 1. Create a secure function to check permission bypassing RLS
-- This breaks the infinite loop because the function runs with admin privileges
create or replace function public.can_manage_group_members(target_group_id uuid)
returns boolean
language plpgsql
security definer -- This is the key: runs as owner, bypassing RLS on tables accessed inside
as $$
declare
  user_company_id bigint;
  group_company_id bigint;
begin
  -- Get current user's company
  select company_id into user_company_id
  from public.users
  where id = auth.uid();

  -- Get group's company
  select company_id into group_company_id
  from public.erp_chat_groups
  where id = target_group_id;

  -- Return true if companies match
  return user_company_id is not null 
         and group_company_id is not null 
         and user_company_id = group_company_id;
end;
$$;

-- 2. Drop the problematic policies
drop policy if exists "Allow Add Members Context" on erp_chat_group_members;
drop policy if exists "Allow Remove Members Context" on erp_chat_group_members;
drop policy if exists "Allow View Members Context" on erp_chat_group_members;
drop policy if exists "Manage Group Members" on erp_chat_group_members;

-- 3. Create the new Safe Policy
create policy "Safe Manage Members" on erp_chat_group_members
  for all using (
    public.can_manage_group_members(group_id)
  );
