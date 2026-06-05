-- Supabase SQL for Home Visit App
-- شغله مرة واحدة في Supabase > SQL Editor

create table if not exists public.home_visits (
  id uuid primary key default gen_random_uuid(),
  visit_date date not null,
  neighborhood text not null,
  patient_name text not null,
  whatsapp_phone text not null,
  call_phone text,
  test_type text default 'صيام',
  coordinator text default 'SA',
  result_status text default 'Pending',
  payment_method text default 'شبكة',
  price numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.home_visits enable row level security;

drop policy if exists "public home visits select" on public.home_visits;
drop policy if exists "public home visits insert" on public.home_visits;
drop policy if exists "public home visits update" on public.home_visits;
drop policy if exists "public home visits delete" on public.home_visits;

create policy "public home visits select"
on public.home_visits for select
to anon
using (true);

create policy "public home visits insert"
on public.home_visits for insert
to anon
with check (true);

create policy "public home visits update"
on public.home_visits for update
to anon
using (true)
with check (true);

create policy "public home visits delete"
on public.home_visits for delete
to anon
using (true);

create index if not exists home_visits_date_idx on public.home_visits (visit_date);
create index if not exists home_visits_patient_idx on public.home_visits (patient_name);
create index if not exists home_visits_phone_idx on public.home_visits (whatsapp_phone);
