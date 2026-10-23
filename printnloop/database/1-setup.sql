-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Replace jaypeom0@gmail.com with YOUR admin email (the one you create in Authentication > Users).

create table if not exists public.products (
  id text primary key,
  data jsonb not null,
  sort bigint not null default (extract(epoch from now())*1000)::bigint,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;

drop policy if exists "anyone can read products" on public.products;
create policy "anyone can read products" on public.products for select using (true);

drop policy if exists "admin writes products" on public.products;
create policy "admin writes products" on public.products for all to authenticated
  using ((auth.jwt()->>'email') = 'jaypeom0@gmail.com')
  with check ((auth.jwt()->>'email') = 'jaypeom0@gmail.com');

-- Photo storage: public to view, only the admin can upload or delete
insert into storage.buckets (id, name, public) values ('product-images','product-images',true)
  on conflict (id) do nothing;

drop policy if exists "admin uploads photos" on storage.objects;
create policy "admin uploads photos" on storage.objects for insert to authenticated
  with check (bucket_id='product-images' and (auth.jwt()->>'email') = 'jaypeom0@gmail.com');
drop policy if exists "admin deletes photos" on storage.objects;
create policy "admin deletes photos" on storage.objects for delete to authenticated
  using (bucket_id='product-images' and (auth.jwt()->>'email') = 'jaypeom0@gmail.com');
