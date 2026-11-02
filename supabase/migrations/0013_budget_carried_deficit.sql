-- ============================================================================
-- Bolivar Convert — Déficit arrastrado en los presupuestos
-- ============================================================================
-- Al concluir un mes, el neto negativo que recibe una categoría ya no queda como
-- extra negativo: pasa entero a `carried_deficit` (positivo) y el extra queda en
-- 0. El déficit arrastrado cuenta como ya utilizado del estimado del mes nuevo.
--
-- Backfill: los extras negativos que ya existían pasan a déficit arrastrado.
-- Lo disponible (estimado + extra − utilizado) no cambia; solo cambia dónde se
-- ve el déficit (como utilizado en vez de extra negativo).
--
-- Nullable: sin déficit arrastrado queda en null.
--
-- Este script es reejecutable.
-- ============================================================================

alter table public.budgets
  add column if not exists carried_deficit text;

update public.budgets
  set carried_deficit = ltrim(carryover, '-'),
      carryover = '0'
  where carryover like '-%'
    and carried_deficit is null;
