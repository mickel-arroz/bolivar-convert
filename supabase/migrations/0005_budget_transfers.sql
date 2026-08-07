-- ============================================================================
-- Bolivar Convert — traspasos de presupuesto entre categorías
-- ============================================================================
-- Al activar otra plantilla, cada asignación origen→destino queda registrada
-- como un traspaso: mueve el `extra` (carryover) al presupuesto destino y
-- computa `spent` como gastado en la categoría destino. Aparece en el feed de
-- movimientos.
--
-- Sin FKs a categories/budget_templates: el traspaso es historial y debe
-- sobrevivir al borrado de la categoría o plantilla (como goal_contributions).
-- ============================================================================

create table if not exists public.budget_transfers (
  id                text not null,
  user_id           uuid not null references auth.users (id) on delete cascade,
  month             text not null,
  from_template_id  text not null,
  from_category_id  text not null,
  to_template_id    text not null,
  to_category_id    text not null,
  extra             text not null default '0',
  spent             text not null default '0',
  currency          text not null,
  date              text not null,
  created_at        text not null,
  primary key (user_id, id)
);

create index if not exists idx_budget_transfers_user on public.budget_transfers (user_id);

alter table public.budget_transfers enable row level security;

create policy "own_budget_transfers" on public.budget_transfers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
