create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  purchase_date date,
  amount_cents integer not null default 0,
  status text not null check (status in ('观望中', '持有中', '已退役', '咸鱼ing', '已卖出')),
  pricing_method text not null check (pricing_method in ('按天', '按次')),
  usage_count integer not null default 0 check (usage_count >= 0),
  sale_amount_cents integer not null default 0,
  retired_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists items_user_id_idx on public.items(user_id);
create index if not exists items_category_id_idx on public.items(category_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.items enable row level security;

drop policy if exists "Users can read own categories" on public.categories;
create policy "Users can read own categories"
on public.categories for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own categories" on public.categories;
create policy "Users can insert own categories"
on public.categories for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own categories" on public.categories;
create policy "Users can update own categories"
on public.categories for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own categories" on public.categories;
create policy "Users can delete own categories"
on public.categories for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own items" on public.items;
create policy "Users can read own items"
on public.items for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own items" on public.items;
create policy "Users can insert own items"
on public.items for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own items" on public.items;
create policy "Users can update own items"
on public.items for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own items" on public.items;
create policy "Users can delete own items"
on public.items for delete
using (auth.uid() = user_id);
