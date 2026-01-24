-- 43_CALENDAR_MODULE.sql

-- Events Table
create table if not exists erp_events (
  id uuid default gen_random_uuid() primary key,
  company_id bigint not null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  type text check (type in ('MEETING', 'TASK', 'REMINDER')),
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Attendees Table
create table if not exists erp_event_attendees (
  event_id uuid references erp_events(id) on delete cascade,
  user_id uuid references auth.users(id),
  status text check (status in ('PENDING', 'ACCEPTED', 'DECLINED')) default 'PENDING',
  primary key (event_id, user_id)
);

-- Enable RLS
alter table erp_events enable row level security;
alter table erp_event_attendees enable row level security;

-- Policies (Assuming public.users table exists and links auth.uid() to company_id)

-- VIEW: Everyone in company can see events (Open calendar policy)
create policy "View Company Events" on erp_events
  for select using (
    company_id in (select company_id from public.users where id = auth.uid())
  );

-- INSERT: Authenticated users can create events for their company
create policy "Insert Events" on erp_events
  for insert with check (
    company_id in (select company_id from public.users where id = auth.uid())
  );

-- UPDATE: Creator can update
create policy "Update Own Events" on erp_events
  for update using (created_by = auth.uid());

-- DELETE: Creator can delete
create policy "Delete Own Events" on erp_events
  for delete using (created_by = auth.uid());

-- ATTENDEES POLICIES
create policy "View Attendees" on erp_event_attendees
  for select using (
    exists (select 1 from erp_events where id = event_id and company_id in (select company_id from public.users where id = auth.uid()))
  );

create policy "Manage Attendees" on erp_event_attendees
  for all using (
    exists (select 1 from erp_events where id = event_id and created_by = auth.uid())
  );

-- Allow users to update their own status
create policy "Update Own Attendance" on erp_event_attendees
  for update using (user_id = auth.uid());
