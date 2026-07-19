-- ============================================================================
-- Bolivar Convert — Comisiones (Billetera)
-- ============================================================================
-- Agrega una comisión opcional (costo) a cuentas y movimientos:
--   • accounts:     comisión por defecto de la cuenta (prellenada en movimientos).
--   • transactions: comisión del ingreso/gasto (reduce el saldo de su cuenta).
--   • transfers:    comisión que paga la cuenta origen (sobre from_amount).
--
-- `commission`      = valor (text, como el resto de montos; acepta coma o punto).
-- `commission_type` = 'percent' | 'fixed' (cómo interpretar el valor).
-- Ambas nullable: sin comisión ⇒ null.
--
-- Reejecutable: `add column if not exists`.
-- ============================================================================

alter table public.accounts     add column if not exists commission      text;
alter table public.accounts     add column if not exists commission_type text;

alter table public.transactions add column if not exists commission      text;
alter table public.transactions add column if not exists commission_type text;

alter table public.transfers    add column if not exists commission      text;
alter table public.transfers    add column if not exists commission_type text;
