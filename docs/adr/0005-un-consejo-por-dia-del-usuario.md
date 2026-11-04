# 5. Un consejo por día del usuario, reclamado en la base

- **Estado**: aceptado
- **Fecha**: 2026-11-04
- **Reemplaza**: [0003](0003-el-consejo-se-refresca-al-entrar-no-por-cron.md)

## Contexto

El ADR 0003 refrescaba el consejo al entrar a Estadísticas o Presupuestos si el guardado
pasaba de 7 días, con un guardia de cliente y mostrando lo nuevo en la visita siguiente.
Una semana resultó demasiado vieja para un consejo que comenta el mes en curso, los
planes de ahorro y las listas de compras.

Acortar el plazo vuelve caros dos costos que el 0003 aceptaba: cada dispositivo abierto
gasta su propia llamada, y un fallo de la IA se reintenta en cada visita sin tope.

## Decisión

Sigue sin haber cron: solo se genera cuando el usuario entra a una de las dos pestañas,
y una sola petición devuelve los dos consejos.

1. **El día es el del usuario**, en la zona horaria de su dispositivo (cookie `tz`,
   luego `x-vercel-ip-timezone`, luego la del servidor), igual que en to-do-priority.
   Hay consejo nuevo cuando la fecha del guardado no es la de hoy, no cuando pasan
   24 horas.
2. **El día se reclama en la base**: `claim_advice_day(p_day)` cuenta intentos de forma
   atómica y concede como mucho 3 por día. Varias pestañas o dispositivos producen una
   sola llamada, un timeout no cuesta el día entero y, agotados los intentos, se para
   hasta mañana.
3. **Lo nuevo reemplaza a lo que hay en pantalla** apenas llega, sin spinner. La
   petición ya sale del cliente, así que no hace falta canal en tiempo real.

## Consecuencias

- El costo sigue escalando con el uso real: a lo sumo una generación por usuario activo
  al día, más los reintentos fallidos.
- No hace falta versionar el prompt: un cambio de prompt tarda como mucho un día en
  llegarle a todos.
- El día del consejo sigue al dispositivo, mientras que el mes de los presupuestos sigue
  fijo en America/Caracas. Para quien vive en Venezuela coinciden; para quien viaja,
  el consejo puede cambiar de día unas horas antes o después que el mes.
