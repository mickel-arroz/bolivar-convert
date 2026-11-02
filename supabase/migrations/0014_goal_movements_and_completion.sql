-- ============================================================================
-- Bolivar Convert — movimientos de planes de ahorro y planes completados
-- ============================================================================
-- Aportes y retiros como movimientos: las partes de un mismo aporte o retiro
-- comparten `goal_contributions.movement_id`, y el ingreso en «Otros» que deja
-- un retiro de dinero sin cuenta lo referencia en `transactions.goal_movement_id`
-- para deshacerse junto con él. Los aportes anteriores quedan sin movement_id:
-- cada uno es su propio movimiento.
--
-- Completar un plan: `goals.completed_at` lo oculta y cada gasto que deja (uno
-- por cuenta, en la categoría «Planes de ahorro», cat_goals) lo referencia en
-- `transactions.completed_goal_id`. Eliminar ese gasto devuelve el plan.
--
-- La categoría cat_goals la siembra la app al cargar (como el resto de las
-- predeterminadas). No admite presupuesto: se borran los que hubiera.
--
-- Este script es reejecutable.
-- ============================================================================

alter table public.goal_contributions
  add column if not exists movement_id text;

alter table public.transactions
  add column if not exists goal_movement_id text,
  add column if not exists completed_goal_id text;

alter table public.goals
  add column if not exists completed_at text;

delete from public.budgets where category_id = 'cat_goals';
