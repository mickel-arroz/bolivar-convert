-- ============================================================================
-- Bolivar Convert — una sola moneda de visualización preferida, con overrides
-- ============================================================================
-- `profiles.display_currency` pasa a ser la Moneda de visualización preferida:
-- el default de todo bloque que convierte. Cada bloque que puede divergir
-- guarda un override nullable; null significa "usa la preferencia".
--
-- 1) El default de fábrica pasa de 'VES' a 'USD' (solo afecta a usuarios
--    nuevos: las filas existentes conservan el valor que ya eligieron).
-- 2) `profiles.networth_currency_override`: override del Patrimonio neto. Antes vivía
--    en localStorage (`bolivar_networth_currency_v1`); el cliente lo sube una
--    sola vez y borra la clave.
-- 3) `shopping_lists.total_currency_override`: override del Precio total de esa lista.
--    Antes no se guardaba: se perdía al cerrar la modal.
-- ============================================================================

-- ─── 1) default de fábrica ───
alter table public.profiles
  alter column display_currency set default 'USD';

-- ─── 2) override del patrimonio neto ───
alter table public.profiles
  add column if not exists networth_currency_override text;

alter table public.profiles
  drop constraint if exists profiles_networth_currency_valid;
alter table public.profiles
  add constraint profiles_networth_currency_valid
  check (networth_currency_override is null or networth_currency_override in ('VES', 'USD', 'EUR'));

-- ─── 3) override del total por lista de compras ───
alter table public.shopping_lists
  add column if not exists total_currency_override text;

alter table public.shopping_lists
  drop constraint if exists shopping_lists_total_currency_valid;
alter table public.shopping_lists
  add constraint shopping_lists_total_currency_valid
  check (total_currency_override is null or total_currency_override in ('VES', 'USD', 'EUR'));
