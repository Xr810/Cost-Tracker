begin;

do $$
begin
  if exists (
    select 1
    from public.items i
    left join public.categories c on c.id = i.category_id
    where c.id is null
  ) then
    raise exception 'Cannot apply migration: some items reference missing categories.';
  end if;

  if exists (
    select 1
    from public.items i
    join public.categories c on c.id = i.category_id
    where c.user_id <> i.user_id
  ) then
    raise exception 'Cannot apply migration: some items reference categories owned by another user.';
  end if;

  if exists (
    select 1
    from public.items
    where amount_cents < 0 or sale_amount_cents < 0
  ) then
    raise exception 'Cannot apply migration: some items contain negative money amounts.';
  end if;
end;
$$;

alter table public.items drop constraint if exists items_category_id_fkey;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.categories'::regclass
      and conname = 'categories_user_id_id_key'
  ) then
    alter table public.categories
      add constraint categories_user_id_id_key unique (user_id, id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.items'::regclass
      and conname = 'items_user_category_fk'
  ) then
    alter table public.items
      add constraint items_user_category_fk
      foreign key (user_id, category_id)
      references public.categories(user_id, id)
      on delete restrict;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.items'::regclass
      and conname = 'items_amount_cents_nonnegative'
  ) then
    alter table public.items
      add constraint items_amount_cents_nonnegative check (amount_cents >= 0);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.items'::regclass
      and conname = 'items_sale_amount_cents_nonnegative'
  ) then
    alter table public.items
      add constraint items_sale_amount_cents_nonnegative check (sale_amount_cents >= 0);
  end if;
end;
$$;

drop policy if exists "Users can insert own items" on public.items;
create policy "Users can insert own items"
on public.items for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.categories
    where categories.id = items.category_id
      and categories.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own items" on public.items;
create policy "Users can update own items"
on public.items for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.categories
    where categories.id = items.category_id
      and categories.user_id = auth.uid()
  )
);

commit;
