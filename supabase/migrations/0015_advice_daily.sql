-- ============================================================================
-- Bolivar Convert — un consejo por día del usuario (ADR 0005)
-- ============================================================================
-- El consejo deja de refrescarse cada 7 días: hay a lo sumo uno nuevo por día del
-- usuario, en la zona horaria de su dispositivo. La fila guarda el día del consejo
-- y cuenta los intentos del día; `claim_advice_day` los reclama de forma atómica.
--
-- Migración **aditiva**: agrega columnas nullables y una función. Las filas viejas
-- quedan sin `advice_date`, así que reciben un consejo nuevo en su próxima entrada.
-- ============================================================================

-- Reclamar el día crea la fila antes de que exista un consejo: los textos pasan a
-- ser opcionales (la app trata una fila sin textos como «sin consejo guardado»).
alter table public.advice alter column stats_text drop not null;
alter table public.advice alter column budget_text drop not null;
alter table public.advice alter column generated_at drop not null;

alter table public.advice add column if not exists advice_date   date;
alter table public.advice add column if not exists attempt_date  date;
alter table public.advice add column if not exists attempt_count integer not null default 0;
-- Cuándo empezó el intento en vuelo; null cuando ninguno corre.
alter table public.advice add column if not exists attempt_started_at timestamptz;

-- Reclama un intento del día para el usuario de la sesión. Devuelve true solo si a
-- esta ejecución le toca llamar a la IA: el bloqueo de fila serializa las pestañas y
-- dispositivos simultáneos, así que dos nunca reciben true a la vez.
--
-- El intento concedido queda reservado mientras corre: otra pestaña o dispositivo no
-- recibe uno nuevo hasta que se guarde el consejo, la app suelte la reserva tras un
-- fallo, o venza (una petición que murió en un timeout no bloquea el día).
--
-- No lo concede con el consejo de hoy ya guardado ni con los intentos del día
-- agotados. Un fallo de la IA gasta un intento, no el día.
create or replace function public.claim_advice_day(p_day date) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  -- Mantener en sintonía con ADVICE_ATTEMPTS_PER_DAY en lib/wallet/advice.ts.
  v_max constant integer := 3;
  v_lease constant interval := interval '2 minutes';
  v_claimed boolean;
begin
  insert into public.advice (id, user_id, attempt_date, attempt_count, attempt_started_at)
  values ('advice_current', auth.uid(), p_day, 1, now())
  on conflict (user_id, id) do update
    set attempt_date = p_day,
        attempt_count = case
          when public.advice.attempt_date is distinct from p_day then 1
          else public.advice.attempt_count + 1
        end,
        attempt_started_at = now()
    where public.advice.advice_date is distinct from p_day
      and (
        public.advice.attempt_date is distinct from p_day
        or (
          public.advice.attempt_count < v_max
          and (
            public.advice.attempt_started_at is null
            or public.advice.attempt_started_at < now() - v_lease
          )
        )
      )
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

revoke execute on function public.claim_advice_day(date) from public, anon;
grant execute on function public.claim_advice_day(date) to authenticated;
