-- ─── aportes a metas huérfanos ───
-- Borrar una cuenta dejaba sus aportes apuntando a un account_id inexistente.
-- La regla ahora es desligarlos (account_id = null), igual que los extras de
-- presupuesto: el dinero se queda en la meta y deja de atribuirse a una cuenta.
-- Ver docs/adr/0002-el-dinero-en-metas-no-sale-de-la-cuenta.md
--
-- Sigue SIN FK a accounts a propósito: el cliente hace el desligado al borrar la
-- cuenta y lo sube como upsert. Una FK con `on delete set null` no sirve porque
-- la llave de accounts es compuesta (user_id, id) y el borrado no pasa por ella.

-- Repara los huérfanos que ya existen. Idempotente.
update public.goal_contributions gc
  set account_id = null
  where gc.account_id is not null
    and not exists (
      select 1
      from public.accounts a
      where a.user_id = gc.user_id
        and a.id = gc.account_id
    );

comment on column public.goal_contributions.account_id is
  'Cuenta de la que salió el aporte. Null = sin cuenta: extra de presupuesto, o cuenta borrada después del aporte. Sin FK a accounts a propósito.';
