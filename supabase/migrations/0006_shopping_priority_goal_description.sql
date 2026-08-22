-- ============================================================================
-- Bolivar Convert — prioridad en ítems de lista de compras + descripción en metas
-- ============================================================================
-- 1) Prioridad obligatoria (1 = alta … 4 = baja) en cada ítem de lista de compras.
--    `default 4` backfillea automáticamente todos los registros existentes de
--    todos los usuarios a la prioridad más baja.
-- 2) Descripción opcional en las metas de ahorro (máx. 300 caracteres en la UI).
-- ============================================================================

-- ─── prioridad en shopping_list_items ───
alter table public.shopping_list_items
  add column if not exists priority integer not null default 4;

-- Backfill explícito por si la columna existiera previamente como nullable.
update public.shopping_list_items
  set priority = 4
  where priority is null;

-- Asegura el rango válido 1..4.
alter table public.shopping_list_items
  drop constraint if exists shopping_list_items_priority_range;
alter table public.shopping_list_items
  add constraint shopping_list_items_priority_range
  check (priority between 1 and 4);

-- ─── descripción en goals ───
alter table public.goals
  add column if not exists description text;
