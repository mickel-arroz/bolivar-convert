-- ============================================================================
-- Bolivar Convert — lápida de categorías por defecto borradas
-- ============================================================================
-- Las categorías por defecto se siembran en el alta del usuario (0001) y el
-- cliente las vuelve a añadir al cargar si faltan, para que un default nuevo
-- llegue a los usuarios que ya existen. Efecto no querido: borrar «Comida» o
-- «Compras» se deshacía en la siguiente carga y la categoría reaparecía.
--
-- Esta lista guarda cuáles borró el usuario, para no volver a sembrarlas.
--
-- Este script es reejecutable.
-- ============================================================================

alter table public.profiles
  add column if not exists deleted_default_categories text[] not null default '{}';
