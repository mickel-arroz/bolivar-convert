-- ============================================================================
-- Bolivar Convert — consejos semanales generados por IA
-- ============================================================================
-- Una fila por usuario con los dos textos del consejo y la fecha en que se
-- generaron. Guardar la **fecha** es lo que hace funcionar la regla de frescura:
-- al entrar a Estadísticas o Presupuesto se compara contra el momento actual y se
-- refresca si pasaron más de 7 días. Una caché con TTL no sirve acá: una llave que
-- se evapora no permite preguntar cuánto tiempo lleva ahí (ADR 0003).
--
-- Migración **aditiva**: crea una tabla nueva y no toca ninguna de las existentes.
-- ============================================================================

-- ─── advice (consejos) ───
-- id es fijo ('advice_current'): la PK compuesta (user_id, id) mantiene la
-- convención del esquema y deja una sola fila por usuario.
create table if not exists public.advice (
  id            text not null default 'advice_current',
  user_id       uuid not null references auth.users (id) on delete cascade,
  stats_text    text not null,
  budget_text   text not null,
  generated_at  text not null,
  primary key (user_id, id)
);

create index if not exists idx_advice_user on public.advice (user_id);

alter table public.advice enable row level security;

drop policy if exists "own_advice" on public.advice;
create policy "own_advice" on public.advice
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
