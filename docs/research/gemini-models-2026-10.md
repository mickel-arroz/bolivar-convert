# Modelos de Gemini API / Google AI Studio en el free tier (octubre 2026)

Investigación del 2026-10-12 para revisar `ADVICE_MODEL_CHAIN` en `lib/ai/gemini.ts`. Uso: texto corto en JSON (dos campos, `stats` y `budget`).

Fuentes: solo primarias (ai.google.dev) más un listado en vivo de `GET /v1beta/models` hecho con la clave del proyecto (`GOOGLE_AI_API_KEY` sale de `.env`, porque `.env.local` no existe). Las páginas consultadas dicen "Last updated" entre el 2026-09-22 y el 2026-10-09.

## TL;DR

- `gemini-3.7-flash` y `gemini-3.5-flash` están **deprecados desde el 2026-10-08**. Siguen respondiendo, pero Google **redirige** las llamadas a `gemini-3.8-flash` y a `gemini-3.6-flash`. En la cadena actual son entradas duplicadas.
- `gemini-3.1-flash-lite` tiene **fecha de apagado: 2027-05-07** (lo reemplaza `gemini-3.5-flash-lite`).
- Desde el 2026-09-18, solo pueden usar `gemini-2.5-flash` los proyectos que ya lo usaron antes. Este proyecto todavía lo ve en el listado en vivo.
- Gemma en la Gemini API: `gemma-4-31b-it` y `gemma-4-26b-a4b-it`. Ambos aceptan system instructions. **No está documentado** que acepten JSON mode ni `responseSchema`.
- **Los docs oficiales ya no publican cifras de RPM/RPD del free tier por modelo.** Remiten al panel de AI Studio. No pude verificar números.

## Catálogo de texto en el free tier (de más a menos capaz)

El orden es una inferencia: sale de la generación de cada modelo y de cómo lo describe Google. No hay un ranking oficial.

| # | ID exacto | Estado | Apagado | Free tier | Structured output (`responseMimeType`/`responseSchema`) |
|---|---|---|---|---|---|
| 1 | `gemini-3.8-flash` | Estable (GA 2026-09-02) | No anunciado | Sí | Sí |
| 2 | `gemini-3.6-flash` | Estable (GA 2026-07-21), "previous-generation Flash" | No anunciado | Sí | Sí |
| 3 | `gemini-3-flash-preview` | Preview (versión `3-flash-preview-12-2025`) | Los preview pueden deprecarse con 2 semanas de aviso | Sí | Sí, por ser de la serie Gemini 3 (no verificado en su ficha) |
| 4 | `gemini-3.5-flash-lite` | Estable (GA 2026-07-21) | No anunciado | Sí | Sí |
| 5 | `gemini-3.1-flash-lite` | Estable (GA 2026-05-07) | **2027-05-07** → `gemini-3.5-flash-lite` | Sí | Sí |
| 6 | `gemini-2.5-pro` | Estable, acceso restringido a usuarios previos | No anunciado | Sí | Sí, por inferencia (no verifiqué su ficha) |
| 7 | `gemini-2.5-flash` | Estable, acceso restringido a usuarios previos | No anunciado | Sí | Sí |
| 8 | `gemini-2.5-flash-lite` | Estable, acceso restringido a usuarios previos | No anunciado | Sí | Sí, por inferencia (no verifiqué su ficha) |
| 9 | `gemma-4-31b-it` | Disponible desde 2026-04-02 | No anunciado | Sí ("Gemma 4: Free of charge") | **No documentado** |
| 10 | `gemma-4-26b-a4b-it` | Disponible desde 2026-04-02 (MoE, 4B activos) | No anunciado | Sí | **No documentado** |

No sirven para este caso:
- `gemini-3.1-pro-preview`: el free tier dice "Not available".
- Las variantes TTS, Live, image y transcribe.
- `gemini-3.1-flash-lite-preview`, `gemini-3-pro-preview`, `gemini-2.0-flash` y `gemini-2.0-flash-lite`: los docs los marcan como "Shut down". `gemini-3.1-flash-lite-preview` igual aparece en el listado en vivo, así que figurar en el listado no garantiza que el modelo responda.

Alias que aparecen en el listado en vivo: `gemini-flash-latest`, `gemini-flash-lite-latest` y `gemini-pro-latest`. Según el esquema de versiones, un alias "latest" cambia de modelo con 2 semanas de aviso. No encontré en los docs a qué modelo apunta hoy cada uno.

Fuentes:
- Catálogo, estados y alias: <https://ai.google.dev/gemini-api/docs/models>
- Fechas de lanzamiento y apagado: <https://ai.google.dev/gemini-api/docs/deprecations>
- Free tier por modelo: <https://ai.google.dev/gemini-api/docs/pricing>
- Fichas de cada modelo, con su tabla de capacidades:
  - <https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash>
  - <https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash>
  - <https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite>
  - <https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite>
  - <https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash>

## Cuotas del free tier (RPM / RPD)

**No se pudo verificar.** La página oficial de rate limits ya no trae una tabla del free tier por modelo. Dice textualmente: "Rate limits depend on a variety of factors (such as your usage tier) and can be viewed in Google AI Studio". Enlaza al panel <https://aistudio.google.com/rate-limit?timeRange=last-28-days>, que requiere sesión. Lo que sí documenta:

- Los límites se aplican **por proyecto, no por API key**, y varían según el modelo.
- El RPD se reinicia a medianoche, hora del Pacífico.

Fuente: <https://ai.google.dev/gemini-api/docs/rate-limits> (y la versión `.md.txt` de la misma página).

Hay una señal que no es primaria. Hilos del foro de Google AI Developers (posts de usuarios) hablan de **20 RPD para `gemini-3.8-flash` en el free tier** y de unos 500 RPD para Flash-Lite. Ejemplo: <https://discuss.ai.google.dev/t/gemini-3-8-flash-free-tier-20-rpd-is-too-limited-for-practical-evaluation/180609>. Otro hilo reporta que los 503 también consumen RPD: <https://discuss.ai.google.dev/t/gemini-api-503-errors-appear-to-consume-free-tier-rpd-leading-to-429-quota-exhaustion/184644>. Hay que confirmarlo en el panel de AI Studio del proyecto.

## Gemma en la Gemini API

- IDs que se pueden llamar: `gemma-4-31b-it` y `gemma-4-26b-a4b-it`. Coincide con el listado en vivo, donde ambos tienen la versión `001` y aceptan `generateContent`. Gemma 4 también existe en tamaños E2B, E4B y 12B, pero esos no se ofrecen por la API.
- **System instructions: sí.** La página "Gemma on Gemini API" trae un ejemplo con system instruction. Además, Gemma 4 "introduces built-in support for the system role".
- **Function calling: sí.** Google Search grounding: sí.
- **JSON mode / `responseSchema`: no documentado.** Ni la página de Gemma en la Gemini API ni la de structured outputs mencionan Gemma. El código actual hace bien en no pedir esquema a Gemma y apoyarse en el parseo tolerante.
- Free tier: la página de precios dice "Gemma 4: Free of charge". No hay cifras de cuota publicadas.

Fuentes:
- <https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api> (actualizada el 2026-07-02)
- <https://ai.google.dev/gemma/docs/core> (actualizada el 2026-07-08)
- <https://ai.google.dev/gemini-api/docs/structured-output> (actualizada el 2026-09-23)
- <https://ai.google.dev/gemini-api/docs/changelog> (entrada del 2026-04-02)

## Revisión de la cadena actual (`lib/ai/gemini.ts`)

| Modelo en la cadena | ¿Disponible? | Estado | Apagado | Comentario |
|---|---|---|---|---|
| `gemini-3.8-flash` | Sí | Estable, el Flash más capaz | No anunciado | Mantener primero |
| `gemini-3.7-flash` | Responde, pero redirigido | **Deprecado 2026-10-08**; "All requests … are automatically routed to `gemini-3.8-flash`" | No anunciado | Duplica el primer paso. No verifiqué si consume la cuota de 3.8 o la suya propia |
| `gemini-3.6-flash` | Sí | Estable | No anunciado | Mantener |
| `gemini-3.5-flash` | Responde, pero redirigido | **Deprecado 2026-10-08**; redirigido a `gemini-3.6-flash` | No anunciado | Duplica el paso anterior |
| `gemini-3.5-flash-lite` | Sí | Estable | No anunciado | Mantener |
| `gemini-3.1-flash-lite` | Sí | Estable | **2027-05-07** | Mantener hasta el apagado |
| `gemini-2.5-flash` | Sí para este proyecto (aparece en el listado en vivo) | Acceso restringido a usuarios previos desde 2026-09-18 | No anunciado | Útil como red extra. Un proyecto nuevo con otra clave podría no tener acceso |
| `gemma-4-31b-it` | Sí | Disponible | No anunciado | Mantener último. Sin structured output documentado |

Fuentes:
- Avisos de deprecación de 3.7 y 3.5: <https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash> y <https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash>
- Entradas del 2026-10-08 y 2026-09-18: <https://ai.google.dev/gemini-api/docs/changelog>
- Fechas: <https://ai.google.dev/gemini-api/docs/deprecations>

## Cadena recomendada (es una recomendación, no una decisión)

```ts
export const ADVICE_MODEL_CHAIN = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',   // se apaga el 2027-05-07
  'gemini-2.5-flash',        // solo funciona en proyectos con uso previo
  'gemini-2.5-flash-lite',   // ídem; cuota separada
  'gemma-4-31b-it',
  'gemma-4-26b-a4b-it',
] as const
```

Por qué:
- Saco `gemini-3.7-flash` y `gemini-3.5-flash` porque hoy solo redirigen a modelos que ya están en la cadena. Ese paso extra suma latencia y no aporta un modelo distinto.
- Agrego `gemini-2.5-flash-lite` y `gemma-4-26b-a4b-it`: tienen free tier y, si el límite es por modelo, cada uno tiene su propia cuota. Que la cuota sea por modelo no está verificado con cifras.
- `gemini-3-flash-preview` es opcional. Tiene free tier y structured output, pero es un preview que puede desaparecer con 2 semanas de aviso.
- `supportsStructuredOutput` (prefijo `gemini-`) sigue siendo correcto para todos los modelos propuestos.

## Pendiente o no verificado

1. Cifras de RPM/RPD del free tier por modelo: solo se ven en el panel de AI Studio. Los docs no las publican.
2. Si una llamada a un modelo deprecado y redirigido (3.7 → 3.8, 3.5 → 3.6) gasta la cuota del modelo de destino.
3. Si Gemma 4 respeta `responseMimeType: 'application/json'` o `responseSchema` en la Gemini API. No está documentado. No hice llamadas `generateContent` de prueba.
4. A qué modelo apuntan hoy `gemini-flash-latest` y `gemini-flash-lite-latest`.
5. Las fichas de `gemini-2.5-pro`, `gemini-2.5-flash-lite` y `gemini-3-flash-preview`: no las abrí. Su soporte de structured output es una inferencia.
