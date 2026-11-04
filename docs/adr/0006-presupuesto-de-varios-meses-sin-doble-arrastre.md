# 6. Presupuesto de varios meses: solo cuenta el arrastre del primer mes

- **Estado**: aceptado
- **Fecha**: 2026-11-04

## Contexto

«Presupuesto vs gastado» en Estadísticas pasó de mirar solo el mes actual a respetar el
Periodo: con 6 meses, 1 año o todo, suma varios meses de presupuesto. Cada mes ya trae su
límite efectivo (estimado más arrastre) y lo usado (con el Déficit arrastrado incluido).

Sumar esas cifras tal cual cuenta dos veces el mismo dinero. Si en septiembre sobran 40 y
se arrastran a octubre, sumar los límites efectivos da 100 + 140 = 240 presupuestados
cuando el usuario solo presupuestó 200. Con un déficit pasa lo mismo, pero con lo usado:
el gasto de más de septiembre vuelve a aparecer en octubre como Déficit arrastrado.

## Decisión

Por cada categoría y moneda, se suman los estimados de todos los meses del Periodo y lo
gastado de verdad en cada mes. Del arrastre y del Déficit arrastrado solo entran los del
primer mes del Periodo, que vienen de antes y por eso son dinero nuevo para el Periodo.
Los de los meses siguientes ya están contados en el mes que los originó.

Con un solo mes (el último mes) el resultado es idéntico al estado del mes, así que la
card no cambia para quien no toca el filtro. La pestaña Presupuestos sigue mostrando el
mes actual.

Se descartó sumar los límites efectivos (cuenta dos veces lo arrastrado) y también
ignorar todo arrastre (un mes que empieza con extra se vería sobrepasado sin estarlo).

## Consecuencias

- La suma es exacta mientras lo arrastrado se quede en la misma categoría.
- Es una aproximación cuando el Reparto del cierre manda un sobrante a otra categoría
  dentro del Periodo: la categoría que lo recibe no lo ve, porque de ella solo cuenta el
  arrastre del primer mes, y puede aparecer sobrepasada si lo gastó. Mandarlo a un Plan de
  ahorro o descartarlo no afecta: ese dinero ya no se iba a gastar en ninguna categoría.
  Se acepta porque la card muestra tendencias de uso, no un cuadre contable.
- Si una categoría cambia de moneda entre meses, el Periodo la muestra en dos filas, una
  por moneda, en vez de convertir presupuestos entre monedas.
