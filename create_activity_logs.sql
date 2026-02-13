-- 1. Create table if not exists
create table if not exists activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  user_name text,
  action_type text not null,
  entity_type text not null,
  entity_id text,
  details jsonb default '{}'::jsonb,
  importance text default 'low',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table activity_logs enable row level security;

-- Drop policies if they exist to allow clean re-run
drop policy if exists "Allow authenticated insert" on activity_logs;
drop policy if exists "Allow Admin and C-level view" on activity_logs;

-- 3. Policy for Inserting (Logging) - Allow all authenticated users to log
create policy "Allow authenticated insert"
on activity_logs for insert
to authenticated
with check (true);

-- 4. Policy for Viewing - Allow only Admin and C-level to view
create policy "Allow Admin and C-level view"
on activity_logs for select
to authenticated
using (
  exists (
    select 1 from managers
    where managers.id = auth.uid()
    and managers.role in ('Admin', 'C-level')
  )
);
