# 2. El dinero en metas no sale de la cuenta

- **Estado**: aceptado
- **Fecha**: 2026-09-21

## Contexto

Aportar a una meta de ahorro escribe una fila en `goal_contributions` con el monto
con signo y nada más: `moveToGoal` no crea transacción ni traspaso. El dinero
nunca se movió en el banco. La meta es una construcción interna de la app.

Pero `computeAccountBalances` sí resta esos aportes, así que la única cifra que la
UI mostraba por cuenta era el saldo ya descontado. El dinero apartado simplemente
desaparecía del saldo sin que nada dijera a dónde se fue.

De ahí salieron tres incoherencias que convivían en el código:

- El patrimonio neto de Resumen restaba las metas; la serie de patrimonio neto de
  `computeStats` no. Dos cifras con el mismo nombre que diferían exactamente en lo
  ahorrado.
- Al editar el saldo de una cuenta, el campo se prellenaba con el saldo descontado
  pero `setAccountBalance` recalculaba la apertura contando solo transacciones y
  traspasos. Abrir el diálogo y guardar sin tocar nada corría el saldo.
- No había forma de saber, mirando una cuenta, cuánto de ella estaba comprometido.

## Decisión

Hay tres cifras por cuenta y se llaman por su nombre (ver `CONTEXT.md`):

- **Saldo de la cuenta**: apertura + ingresos − gastos ± traspasos. Lo que diría el
  banco. Las metas no entran.
- **En metas**: la suma de los aportes de esa cuenta.
- **Disponible**: Saldo de la cuenta − En metas. Es un valor derivado, nunca
  almacenado.

De ahí se sigue el resto:

- El campo de editar saldo significa **Saldo de la cuenta**, porque quien lo abre
  está cuadrando contra su banco y su banco no sabe nada de sus metas. El cálculo
  de `setAccountBalance` ya era correcto; lo que se corrige es el prellenado.
- El dinero en metas **es patrimonio**: ahorrar no empobrece. El patrimonio neto de
  Resumen deja de restarlo y queda de acuerdo con `computeStats`.
- No hay columna nueva ni migración. El dato ya existía en `goal_contributions`.

## Consecuencias

- La cifra grande de cada tarjeta de cuenta pasa a ser el **Disponible**, que puede
  ser menor que lo que dice el banco. La línea "En metas" debajo explica la
  diferencia, y solo aparece cuando hay algo apartado.
- El patrimonio neto de Resumen sube, de golpe, por el monto de lo ahorrado. Se
  acompaña de una línea "de lo cual X en metas" para que el salto tenga explicación.
- Los aportes que vienen de un extra de presupuesto (`allocateExtraToGoal`) no
  tienen cuenta: ese dinero cuenta en la meta pero no aparece como **En metas** de
  ninguna cuenta. La suma de "En metas" sobre todas las cuentas puede ser menor que
  la suma de los saldos de las metas, y es correcto que así sea.
- Si algún día hacen falta bloqueos manuales, sin meta detrás, esta decisión ya no
  alcanza: **En metas** dejaría de ser el nombre cierto y haría falta persistir algo.
