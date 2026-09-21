# 3. El consejo se refresca al entrar a la vista, no por cron

- **Estado**: aceptado
- **Fecha**: 2026-09-21

## Contexto

Las pestañas Estadísticas y Presupuesto muestran un consejo generado por un modelo
de Google AI Studio. El free tier tiene cuota limitada, así que la llamada tiene
que estar acotada por usuario y por tiempo.

El repo ya tiene dos mecanismos que parecían candidatos obvios y no se usaron.
GitHub Actions corre los scrapers de tasas en cron, y Upstash Redis cachea el
historial de tasas con TTL.

## Decisión

El consejo se guarda en una tabla de Supabase con RLS por usuario, con la fecha en
que se generó. Al entrar a cualquiera de las dos vistas:

1. Se lee lo guardado y se muestra de inmediato. Si no hay nada, se muestra un
   texto genérico que vive en el código.
2. Después, sin indicador de carga, se compara la fecha guardada contra el momento
   actual. Si pasaron más de 7 días, se pide uno nuevo y se guarda.
3. El consejo nuevo **no** reemplaza lo que hay en pantalla: se ve en la próxima
   visita.

No hay tarea programada. La antigüedad se mide en tiempo transcurrido, no en días
de calendario, así que no interviene ningún huso horario.

Un guardia en el cliente impide que abrir las dos pestañas seguidas dispare dos
actualizaciones. Por debajo de un mínimo de datos (una cuenta recién creada, sin
movimientos) no se llama a la API: se muestra el texto genérico.

## Consecuencias

- Un usuario que no entra en un mes no gasta ninguna llamada. El costo escala con
  el uso real, que es lo que un cron no sabe hacer: un cron semanal paga por cada
  usuario registrado, esté activo o no.
- El usuario siempre ve el consejo al instante, nunca un spinner, a cambio de que
  el consejo pueda tener hasta una semana y un día de antigüedad la primera vez que
  entra después de vencido.
- Guardar la **fecha** es lo que hace funcionar la comparación, y por eso la caché
  no puede vivir en Redis con TTL: una llave que se evapora no permite preguntar
  cuánto tiempo lleva ahí. La tabla también sobrevive a que Redis no esté
  configurado, cosa que `getRedis()` permite silenciosamente.
- El guardia es de cliente, así que la misma persona con la app abierta en dos
  dispositivos a la vez puede gastar dos llamadas. Se acepta.
