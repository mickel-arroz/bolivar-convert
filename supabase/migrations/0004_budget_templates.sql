-- ============================================================================
-- Bolivar Convert — plantillas de presupuesto
-- ============================================================================
-- Una plantilla es un GRUPO de presupuestos del usuario, con nombre, descripción
-- corta, icono y color. Cada presupuesto (tabla `budgets`) pertenece a una
-- plantilla vía `template_id`: la misma categoría puede tener presupuesto en varias
-- plantillas (filas distintas), pero solo uno por (plantilla, categoría, mes).
--
-- Siempre existe una plantilla por defecto con id fijo 'tpl_default' (como las
-- categorías 'cat_food'…). El perfil apunta a la plantilla activa.
-- ============================================================================

-- ─── budget_templates ───
create table if not exists public.budget_templates (
  id           text not null,
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  description  text,
  icon         text,
  color        text,
  is_default   boolean not null default false,
  created_at   text not null,
  primary key (user_id, id)
);

create index if not exists idx_budget_templates_user on public.budget_templates (user_id);

alter table public.budget_templates enable row level security;

create policy "own_budget_templates" on public.budget_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── budgets.template_id + puntero de plantilla activa en profiles ───
alter table public.budgets   add column if not exists template_id text;
alter table public.profiles  add column if not exists active_budget_template_id text;

-- ─── Backfill de usuarios existentes ───
-- Plantilla por defecto para cada usuario que ya tenga perfil o presupuestos.
insert into public.budget_templates (id, user_id, name, is_default, created_at)
select distinct 'tpl_default', uid, 'Predeterminada', true, now()::text
from (
  select id as uid from public.profiles
  union
  select user_id as uid from public.budgets
) u
on conflict (user_id, id) do nothing;

-- Asociar los presupuestos existentes a la plantilla por defecto.
update public.budgets set template_id = 'tpl_default' where template_id is null;

-- Fijar la plantilla activa en los perfiles existentes.
update public.profiles
  set active_budget_template_id = 'tpl_default'
  where active_budget_template_id is null;

-- FK (tras el backfill, ya no quedan template_id nulos).
alter table public.budgets drop constraint if exists budgets_template_fk;
alter table public.budgets
  add constraint budgets_template_fk
  foreign key (user_id, template_id)
  references public.budget_templates (user_id, id) on delete cascade;

-- ============================================================================
-- Trigger: sembrar la plantilla por defecto (y su puntero activo) al crear usuario.
-- Reemplaza handle_new_user conservando el sembrado de perfil y categorías.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, active_budget_template_id)
  values (new.id, 'tpl_default')
  on conflict (id) do nothing;

  insert into public.budget_templates (id, user_id, name, is_default, created_at)
  values ('tpl_default', new.id, 'Predeterminada', true, now()::text)
  on conflict (user_id, id) do nothing;

  insert into public.categories (id, user_id, name, kind, icon, color, is_default) values
    ('cat_food',       new.id, 'Comida',     'expense', 'food',       'var(--rate-binance)',     true),
    ('cat_transport',  new.id, 'Transporte', 'expense', 'transport',  'var(--rate-eur)',         true),
    ('cat_services',   new.id, 'Servicios',  'expense', 'services',   'var(--rate-usd)',         true),
    ('cat_shopping',   new.id, 'Compras',    'expense', 'shopping',   'var(--chart-4)',          true),
    ('cat_health',     new.id, 'Salud',      'expense', 'health',     '#ef4444',                 true),
    ('cat_other_exp',  new.id, 'Otros',      'expense', 'other',      'var(--muted-foreground)', true),
    ('cat_salary',     new.id, 'Salario',    'income',  'salary',     'var(--rate-usd)',         true),
    ('cat_remittance', new.id, 'Remesas',    'income',  'remittance', 'var(--rate-eur)',         true),
    ('cat_other_inc',  new.id, 'Otros',      'income',  'coin',       'var(--rate-binance)',     true)
  on conflict (user_id, id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
