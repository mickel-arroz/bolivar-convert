-- ============================================================================
-- Bolivar Convert — categoría opcional en los productos de la lista de compras
-- ============================================================================
-- Un producto puede llevar una categoría de gasto. Al marcarlo como comprado, es
-- la categoría del gasto que se registra, y por ella el gasto entra en el
-- presupuesto de esa categoría del mes de la compra.
--
-- Nullable y sin backfill: los productos existentes quedan sin categoría y sus
-- compras siguen cayendo en «Compras» (cat_shopping), como hasta ahora.
--
-- Sin FK a `categories`, igual que `budget_transfers` (ver 0005): un FK compuesto
-- con `on delete set null` anularía también `user_id`, que es `not null`. La
-- integridad la mantiene la app, que al borrar una categoría limpia los productos
-- que la usaban y al cargar descarta una categoría que ya no exista.
--
-- Este script es reejecutable.
-- ============================================================================

alter table public.shopping_list_items
  add column if not exists category_id text;
