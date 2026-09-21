# Bolívar Convert

Billetera personal para Venezuela: registra dinero y compras en bolívares y divisas, y las convierte entre monedas usando tasas de cambio de distintas fuentes.

## Language

### Monedas y tasas

**Moneda de visualización**:
La moneda a la que se convierten los montos mostrados en un bloque de la UI. Distinta de la moneda propia de cada monto.
_Avoid_: moneda base, moneda del total

**Moneda de visualización preferida**:
La Moneda de visualización que el usuario eligió para toda la app. Es el default de cada bloque que convierte y la única que se guarda por usuario. De fábrica es el dólar.
_Avoid_: moneda global, moneda por defecto, moneda del perfil

**Override de moneda**:
La Moneda de visualización que un bloque concreto usa en vez de la preferida, porque el usuario se la cambió ahí. Un bloque sin override sigue a la preferida, también cuando esta cambia después; elegir la preferida en un bloque es precisamente quitarle el override. Hoy existen dos: el del Patrimonio neto y el del Precio total de una lista de compras.
_Avoid_: moneda local, moneda de la vista, excepción

**Fuente de tasa**:
De dónde sale la tasa usada en una conversión: BCV, Binance o personalizada (escrita a mano por el usuario).
_Avoid_: proveedor, origen

### Cuentas y metas

**Meta de ahorro**:
Una alcancía con nombre donde el usuario aparta dinero para un objetivo. No depende del mes.
_Avoid_: objetivo, ahorro, hucha

**Saldo de la cuenta**:
Todo el dinero que hay en una cuenta, metas incluidas: lo que diría el banco. Es la cifra que el usuario escribe al cuadrar una cuenta, y equivale a Disponible más En metas.
_Avoid_: saldo total, balance real

**Disponible**:
Lo que el usuario puede gastar de una cuenta: su Saldo de la cuenta menos lo que apartó en metas de ahorro.
_Avoid_: saldo libre, balance disponible

**En metas**:
El dinero de una cuenta que el usuario apartó en metas de ahorro. Sigue siendo suyo y cuenta como patrimonio, pero no está Disponible.
_Avoid_: bloqueado, reservado, apartado, congelado

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

### Resumen de todas las listas

**Precio total de todas las listas**:
El Precio total de cada lista de compras, sumado, convertido a la moneda de visualización.
_Avoid_: precio total global, gran total

**Restante total por pagar**:
El Restante por pagar de cada lista, sumado, convertido a la moneda de visualización.
_Avoid_: restante global, pendiente total

**Comprados** / **Por comprar**:
Los dos conteos de productos de una lista: cuántos ya se pagaron y cuántos no.
_Avoid_: completados, pendientes, hechos

### Consejos

**Consejo**:
Un párrafo corto generado a partir de los datos agregados del usuario, que se muestra arriba de una pestaña. Hay dos: el de Estadísticas mira hacia atrás y el de Presupuesto hacia adelante. Se refresca al entrar si el guardado pasó de 7 días, y lo nuevo se ve en la visita siguiente.
_Avoid_: recomendación, insight, tip, análisis

**Texto genérico**:
El consejo que vive en el código y se muestra cuando no hay nada guardado, cuando el usuario no tiene datos suficientes o cuando la generación falla. Nunca es un error ni un espacio vacío.
_Avoid_: placeholder, fallback, texto por defecto
