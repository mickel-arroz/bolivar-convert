-- ============================================================================
-- Bolivar Convert — Listas de Compras (Billetera › Presupuesto)
-- ============================================================================
-- Mismas convenciones que 0001_init.sql: PK compuesta (user_id, id), ids/fechas/
-- montos como `text`, RLS por usuario. Cada producto guarda su propia moneda y,
-- si fue comprado, los datos de la compra en la columna `purchase` (jsonb).
--
-- Este script es reejecutable: create table if not exists + drop policy if exists.
-- ============================================================================

-- ─── shopping_lists (listas de compras) ───
create table if not exists public.shopping_lists (
  id          text not null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  icon        text,
  color       text,
  created_at  text not null,
  primary key (user_id, id)
);

-- ─── shopping_list_items (productos de una lista) ───
-- `purchase` (jsonb) = { accountId, cost, rate?, transactionId, date } cuando purchased = true.
create table if not exists public.shopping_list_items (
  id           text not null,
  user_id      uuid not null references auth.users (id) on delete cascade,
  list_id      text not null,
  title        text not null,
  description  text,
  price        text not null,
  currency     text not null,
  purchased    boolean not null default false,
  purchase     jsonb,
  created_at   text not null,
  primary key (user_id, id),
  foreign key (user_id, list_id) references public.shopping_lists (user_id, id) on delete cascade
);

-- ─── Índices por user_id para las lecturas de carga ───
create index if not exists idx_shopping_lists_user       on public.shopping_lists (user_id);
create index if not exists idx_shopping_list_items_user  on public.shopping_list_items (user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.shopping_lists      enable row level security;
alter table public.shopping_list_items enable row level security;

drop policy if exists "own_shopping_lists" on public.shopping_lists;
create policy "own_shopping_lists" on public.shopping_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_shopping_list_items" on public.shopping_list_items;
create policy "own_shopping_list_items" on public.shopping_list_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
