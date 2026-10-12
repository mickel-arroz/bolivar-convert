-- ============================================================================
-- Bolivar Convert — «Otros» de gasto no admite presupuesto
-- ============================================================================
-- «Otros» (cat_other_exp / cat_other_inc) pasa a ser una categoría del sistema:
-- recibe lo que el usuario no clasificó. La de gasto no admite presupuesto, así
-- que se borran los que existan sobre ella, en cualquier plantilla y mes.
--
-- Los traspasos de presupuesto (`budget_transfers`) son historial y se quedan.
--
-- Las lápidas de «Otros» en `deleted_default_categories` también se quitan: la
-- app la vuelve a sembrar aunque el usuario la hubiera borrado.
--
-- Este script es reejecutable.
-- ============================================================================

delete from public.budgets where category_id = 'cat_other_exp';

update public.profiles
  set deleted_default_categories =
    array_remove(array_remove(deleted_default_categories, 'cat_other_exp'), 'cat_other_inc')
  where deleted_default_categories && array['cat_other_exp', 'cat_other_inc'];
