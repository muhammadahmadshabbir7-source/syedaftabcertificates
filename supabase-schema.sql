create table if not exists public.training_records (
  id text primary key,
  record jsonb not null,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.training_records
alter column sort_order type bigint;

alter table public.training_records enable row level security;

drop policy if exists "Public can read training records" on public.training_records;
create policy "Public can read training records"
on public.training_records
for select
to anon, authenticated
using (true);

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  username text primary key,
  password_salt text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

insert into public.admin_users (username, password_salt, password_hash)
values (
  'syedaftabgillani',
  'd01d2b9cadabc72518a70d77535fd377',
  'd24cc23fadd2679055ec75526db28b29fcc3b702fd350a050d75c3a4590014fe'
)
on conflict (username) do update
set
  password_salt = excluded.password_salt,
  password_hash = excluded.password_hash,
  updated_at = now();

create or replace function public.verify_admin_login(input_username text, input_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_salt text;
  stored_hash text;
begin
  select password_salt, password_hash
  into stored_salt, stored_hash
  from public.admin_users
  where username = input_username;

  if stored_hash is null then
    return false;
  end if;

  return encode(extensions.digest(convert_to(stored_salt || input_password, 'UTF8'), 'sha256'), 'hex') = stored_hash;
end;
$$;

revoke all on function public.verify_admin_login(text, text) from public;
grant execute on function public.verify_admin_login(text, text) to anon, authenticated;

drop policy if exists "Publishable key can insert training records" on public.training_records;
create policy "Publishable key can insert training records"
on public.training_records
for insert
to anon, authenticated
with check (true);

drop policy if exists "Publishable key can update training records" on public.training_records;
create policy "Publishable key can update training records"
on public.training_records
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Publishable key can delete training records" on public.training_records;
create policy "Publishable key can delete training records"
on public.training_records
for delete
to anon, authenticated
using (true);
