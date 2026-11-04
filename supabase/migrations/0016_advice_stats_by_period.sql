-- ============================================================================
-- Bolivar Convert — un consejo de Estadísticas por período
-- ============================================================================
-- El consejo de Estadísticas pasa a tener un texto por cada período del selector
-- (1m, 6m, 1y, all) y se muestra el del período elegido. Se guardan juntos en
-- `stats_by_period` como {"1m": "...", "6m": "...", "1y": "...", "all": "..."}.
--
-- Migración **aditiva**: agrega una columna nullable. `stats_text` se sigue escribiendo
-- con el texto de 1m; una fila vieja sin `stats_by_period` muestra su `stats_text` en
-- los cuatro períodos hasta que se genere el consejo del día siguiente.
-- ============================================================================

alter table public.advice add column if not exists stats_by_period jsonb;
