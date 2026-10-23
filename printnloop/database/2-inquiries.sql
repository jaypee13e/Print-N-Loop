-- Run once in Supabase SQL Editor (after 1-setup.sql).
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 80),
  contact text not null check (char_length(contact) between 3 and 120),
  product text not null check (char_length(product) between 1 and 120),
  quantity text check (char_length(quantity) <= 40),
  message text not null check (char_length(message) between 1 and 1000),
  status text not null default 'new' check (status in ('new','contacted','done'))
);
alter table public.inquiries enable row level security;
drop policy if exists "anyone can send inquiry" on public.inquiries;
create policy "anyone can send inquiry" on public.inquiries for insert to anon, authenticated with check (status = 'new');
drop policy if exists "admin reads inquiries" on public.inquiries;
create policy "admin reads inquiries" on public.inquiries for select to authenticated using ((auth.jwt()->>'email') = 'jaypeom0@gmail.com');
drop policy if exists "admin updates inquiries" on public.inquiries;
create policy "admin updates inquiries" on public.inquiries for update to authenticated using ((auth.jwt()->>'email') = 'jaypeom0@gmail.com') with check ((auth.jwt()->>'email') = 'jaypeom0@gmail.com');
drop policy if exists "admin deletes inquiries" on public.inquiries;
create policy "admin deletes inquiries" on public.inquiries for delete to authenticated using ((auth.jwt()->>'email') = 'jaypeom0@gmail.com');
