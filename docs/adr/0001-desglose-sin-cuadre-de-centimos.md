# 1. El desglose por prioridad no se cuadra contra el total

- **Estado**: aceptado
- **Fecha**: 2026-08-27

## Contexto

El bloque de totales de una lista de compras muestra el Precio total y el Restante
por pagar convertidos a la moneda de visualización, y encima de ellos un Desglose
por prioridad con esas dos cifras partidas por prioridad.

Cada producto tiene precio en su propia moneda. Al convertir y redondear a dos
decimales por separado, la suma de las filas del desglose puede diferir del total
en uno o dos céntimos. Con cuatro prioridades el error máximo es de 0,02.

Un lector futuro que vea `Bs. 500,00 + Bs. 400,00 + Bs. 300,01 ≠ Bs. 1.200,00` va a
leerlo como un bug y a "arreglarlo" ajustando la última fila.

## Decisión

Cada fila del desglose se redondea de forma independiente. No se cuadra contra el
total: el total grande nunca se altera para que las filas sumen, y ninguna fila se
altera para que la suma cierre.

`computeShoppingTotals` calcula el total y el restante sumando los productos, no
sumando las filas del desglose, así que los dos totales grandes son exactos y son
las filas las que arrastran el redondeo.

Los tests unitarios afirman la suma de filas contra el total con una tolerancia
explícita de 0,02, para dejar la decisión escrita donde se rompería.

## Consecuencias

- Las cifras del desglose son ciertas por prioridad: cada una es lo que cuesta esa
  prioridad, no lo que necesita valer para que la columna cierre.
- Un usuario que sume las filas a mano puede encontrar una diferencia de céntimos.
  Es aceptable: el bloque vive bajo una sección llamada Estimado y las tasas de
  cambio pueden ser escritas a mano por el usuario.
- Si algún día se necesita cuadre exacto (por ejemplo para exportar una factura
  real), hay que decidir explícitamente qué fila absorbe el ajuste; hoy no hay
  ninguna razón para que sea la prioridad 4.
