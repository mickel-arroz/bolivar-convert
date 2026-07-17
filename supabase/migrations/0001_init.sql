-- ============================================================================
-- Bolivar Convert — schema inicial: billetera por usuario
-- ============================================================================
-- Cada tabla se enlaza al usuario autenticado (auth.users) y está protegida por
-- Row Level Security: un usuario solo ve/modifica sus propias filas.
--
-- Los ids de las entidades se generan en el cliente (strings cortos) y las
-- categorías por defecto usan ids fijos ('cat_food', ...). Por eso los ids son
-- `text` y la PK es compuesta (user_id, id): así los ids solo deben ser únicos
-- por usuario y las FKs garantizan integridad dentro del mismo usuario.
--
-- Montos y fechas se guardan como `text` para conservar exactamente la forma de
-- WalletState (strings numéricos, fechas ISO) y evitar conversiones de parseo.
-- ============================================================================

-- ─── profiles: preferencias del usuario (1 fila por usuario) ───
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_currency  text not null default 'VES',
  stats_rate_source text not null default 'bcvUsd',
  time_range        text not null default '1m',
  concluded_months  text[] not null default '{}',
  updated_at        timestamptz not null default now()
);

-- ─── accounts (cuentas) ───
create table if not exists public.accounts (
  id               text not null,
  user_id          uuid not null references auth.users (id) on delete cascade,
  name             text not null,
  currency         text not null,
  opening_balance  text not null default '0',
  icon             text not null default 'wallet',
  color            text,
  created_at       text not null,
  primary key (user_id, id)
);

-- ─── categories (categorías) ───
create table if not exists public.categories (
  id          text not null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  kind        text not null,
  icon        text not null,
  color       text,
  is_default  boolean not null default false,
  primary key (user_id, id)
);

-- ─── transactions (movimientos) ───
create table if not exists public.transactions (
  id           text not null,
  user_id      uuid not null references auth.users (id) on delete cascade,
  type         text not null,
  account_id   text not null,
  category_id  text not null,
  amount       text not null,
  note         text,
  date         text not null,
  created_at   text not null,
  primary key (user_id, id),
  foreign key (user_id, account_id) references public.accounts (user_id, id) on delete cascade,
  foreign key (user_id, category_id) references public.categories (user_id, id) on delete cascade
);

-- ─── transfers (traspasos entre cuentas) ───
create table if not exists public.transfers (
  id               text not null,
  user_id          uuid not null references auth.users (id) on delete cascade,
  from_account_id  text not null,
  to_account_id    text not null,
  from_amount      text not null,
  to_amount        text not null,
  rate_source      text,
  rate_value       text,
  note             text,
  date             text not null,
  created_at       text not null,
  primary key (user_id, id),
  foreign key (user_id, from_account_id) references public.accounts (user_id, id) on delete cascade,
  foreign key (user_id, to_account_id) references public.accounts (user_id, id) on delete cascade
);

-- ─── budgets (presupuestos: upsert por categoría + mes) ───
create table if not exists public.budgets (
  id           text not null,
  user_id      uuid not null references auth.users (id) on delete cascade,
  category_id  text not null,
  month        text not null,
  "limit"      text not null,
  currency     text not null,
  carryover    text,
  primary key (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id) on delete cascade
);

-- ─── goals (metas de ahorro / alcancías) ───
create table if not exists public.goals (
  id          text not null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  currency    text not null,
  target      text,
  icon        text,
  color       text,
  created_at  text not null,
  primary key (user_id, id)
);

-- ─── goal_contributions (aportes/retiros hacia metas) ───
-- account_id es opcional (null = extra de presupuesto) y SIN FK a accounts, para
-- replicar el comportamiento actual: borrar una cuenta NO borra sus aportes.
create table if not exists public.goal_contributions (
  id          text not null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  goal_id     text not null,
  account_id  text,
  amount      text not null,
  note        text,
  date        text not null,
  created_at  text not null,
  primary key (user_id, id),
  foreign key (user_id, goal_id) references public.goals (user_id, id) on delete cascade
);

-- ─── Índices por user_id para las lecturas de carga ───
create index if not exists idx_accounts_user           on public.accounts (user_id);
create index if not exists idx_categories_user          on public.categories (user_id);
create index if not exists idx_transactions_user        on public.transactions (user_id);
create index if not exists idx_transfers_user           on public.transfers (user_id);
create index if not exists idx_budgets_user             on public.budgets (user_id);
create index if not exists idx_goals_user               on public.goals (user_id);
create index if not exists idx_goal_contributions_user  on public.goal_contributions (user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles           enable row level security;
alter table public.accounts           enable row level security;
alter table public.categories         enable row level security;
alter table public.transactions       enable row level security;
alter table public.transfers          enable row level security;
alter table public.budgets            enable row level security;
alter table public.goals              enable row level security;
alter table public.goal_contributions enable row level security;

create policy "own_profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own_accounts" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_transfers" on public.transfers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_goal_contributions" on public.goal_contributions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Trigger: al crear un usuario, sembrar su perfil y categorías por defecto
-- (mismos ids/valores que DEFAULT_CATEGORIES en constants/walletCategories.tsx)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;

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
