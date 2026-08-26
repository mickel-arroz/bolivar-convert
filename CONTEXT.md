# Bolívar Convert

Billetera personal para Venezuela: registra dinero y compras en bolívares y divisas, y las convierte entre monedas usando tasas de cambio de distintas fuentes.

## Language

### Monedas y tasas

**Moneda de visualización**:
La moneda a la que se convierten los montos mostrados en un bloque de la UI, elegida por el usuario. Distinta de la moneda propia de cada monto.
_Avoid_: moneda base, moneda del total

**Fuente de tasa**:
De dónde sale la tasa usada en una conversión: BCV, Binance o personalizada (escrita a mano por el usuario).
_Avoid_: proveedor, origen

### Lista de compras

**Lista de compras**:
Una agrupación con nombre y color de productos que el usuario piensa comprar.
_Avoid_: lista, carrito

**Producto**:
Un renglón de una lista de compras, con precio en su propia moneda y una prioridad.
_Avoid_: ítem, artículo, elemento

**Prioridad**:
Qué tan pronto el usuario quiere comprar un producto, del 1 al 4, donde **1 es la más urgente**: 1 Alta, 2 Media, 3 Baja, 4 Mínima.
_Avoid_: importancia, urgencia, nivel

**Comprado**:
Un producto que el usuario ya pagó. Sigue contando en el Precio total, pero sale del Restante por pagar.
_Avoid_: completado, hecho, cerrado

### Totales de una lista

**Estimado**:
Los subtotales de una lista **sin convertir**, uno por cada moneda que aparece entre sus productos.
_Avoid_: subtotal, aproximado

**Precio total**:
Lo que cuesta la lista completa, comprados incluidos, convertido a la moneda de visualización.
_Avoid_: total a pagar, gran total

**Restante por pagar**:
Lo que falta por gastar en la lista: solo los productos no comprados, convertido a la moneda de visualización.
_Avoid_: pendiente, faltante, saldo

**Desglose por prioridad**:
El Precio total y el Restante por pagar de una lista, partidos en una cifra por cada prioridad presente.
_Avoid_: resumen por prioridad, breakdown
