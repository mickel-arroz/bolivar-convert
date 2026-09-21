# 4. Una preferencia de moneda con overrides por bloque

- **Estado**: aceptado
- **Fecha**: 2026-09-21

## Contexto

"En qué moneda quiero ver las cosas" estaba respondido en tres sitios, con tres
defaults y tres mecanismos de persistencia:

| Bloque | Default | Se guardaba en |
| --- | --- | --- |
| Estadísticas | `'VES'` | `profiles.display_currency` |
| Patrimonio neto | `'USD'` | localStorage, `bolivar_networth_currency_v1` |
| Precio total de una lista | `'VES'` | nada; se perdía al cerrar la modal |

Un usuario podía poner su preferencia en dólares y seguir viendo bolívares en dos
de las tres pantallas.

Había dos lecturas. La primera: es un bug, hay una sola preferencia y hay que
unificarla. La segunda: son tres preferencias distintas, porque en Venezuela
pensar el patrimonio en dólares y las compras en bolívares es un caso legítimo, no
una inconsistencia.

## Decisión

Las dos lecturas son ciertas a la vez, así que se separan el **default** y el
**valor efectivo**.

`profiles.display_currency` es la **Moneda de visualización preferida**: la única
que se guarda como preferencia del usuario y el default de todo bloque que
convierte. Su valor de fábrica pasa de `'VES'` a `'USD'`.

Un bloque que puede divergir guarda un **override** nullable; `null` significa
"usa la preferencia", y por eso un bloque sin override sigue a la preferencia
también cuando esta cambia después. Hay dos:

- `profiles.networth_currency_override` — Patrimonio neto.
- `shopping_lists.total_currency_override` — Precio total de esa lista, por lista.

Una sola regla gobierna los dos, en `nextOverride`: **elegir la moneda que ya es la
preferida borra el override**. No hay forma de fijar un bloque a la moneda preferida:
mientras coincidan, "fijado" y "siguiendo" se ven igual, y cuando la preferencia
cambie, seguirla es lo que el usuario espera.

Estadísticas no tiene override: su toggle escribe la preferencia. Es el único
sitio de la app donde se cambia la preferencia.

`resolveDisplayCurrency(override, preferencia)` en `lib/wallet/displayCurrency.ts`
es la única función que responde la pregunta. Ningún componente vuelve a quemar
una moneda.

El valor que había en localStorage se sube al perfil. La migración vive en
`useWallet`, no en la pestaña Resumen, porque la app recuerda la última pestaña y
Resumen puede no montarse. La clave vieja **solo se borra cuando un sync termina
bien**: si la carga o la subida fallan, el valor sigue en localStorage y se
reintenta en la próxima sesión. No se descarta: era una elección explícita.

## Consecuencias

- Un usuario nuevo ve dólares en los tres bloques. Los usuarios existentes
  conservan su `display_currency`: `alter column ... set default` no toca las
  filas que ya están.
- La moneda del Patrimonio neto y la de cada lista ahora viajan entre
  dispositivos, porque salieron de localStorage. Se acabó el tercer mecanismo de
  persistencia.
- Los dos selectores siguen mostrando solo las tres monedas: quitar un override es
  elegir la preferida, no una cuarta opción. A cambio, un usuario no puede fijar un
  bloque a la moneda que hoy es su preferida para que **no** lo siga si la cambia
  mañana. Se acepta: es un caso que nadie pidió y la alternativa era una opción
  extra en cada selector.
- Un dispositivo cuya primera carga tras el cambio ocurre **después** de que el
  usuario borró el override en otro dispositivo va a resucitarlo una vez, porque
  `null` no distingue "nunca eligió" de "eligió y lo quitó". Se corrige solo al
  volver a borrarlo, y la clave ya no vuelve.
- Cambiar de moneda en una lista ahora es una escritura que se sincroniza, no
  estado de la modal. Es el precio de que se recuerde.
