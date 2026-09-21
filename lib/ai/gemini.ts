/**
 * Cliente de Google AI Studio — SOLO servidor.
 *
 * La clave vive únicamente en `GOOGLE_AI_API_KEY`, una variable de entorno del
 * servidor: el navegador nunca habla con Google, llega a `/api/wallet/advice` y el
 * endpoint hace la llamada. No hay ninguna variable `NEXT_PUBLIC_*` acá a propósito.
 */
import { GoogleGenAI } from '@google/genai'
import { Type } from '@google/genai'
import type { AdviceModelCall } from '@/lib/wallet/advice'

/**
 * Cadena de modelos, recorrida uno a uno y en orden hasta que uno responda con los
 * dos párrafos, porque cada modelo tiene su propia cuota en el free tier. Gemma va
 * de último recurso: no está confirmado que soporte salida estructurada, y de eso se
 * encarga el parseo tolerante de `parseAdviceResponse`.
 */
export const ADVICE_MODEL_CHAIN = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemma-4-31b-it',
] as const

/** La salida estructurada solo se pide donde está documentada: los modelos flash. */
const ADVICE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    stats: { type: Type.STRING },
    budget: { type: Type.STRING },
  },
  required: ['stats', 'budget'],
}

function supportsStructuredOutput(model: string): boolean {
  return model.startsWith('gemini-')
}

/** `true` si el servidor tiene clave configurada. Sin ella no se llama a Google. */
export function hasGoogleAiKey(): boolean {
  return Boolean(process.env.GOOGLE_AI_API_KEY)
}

/**
 * La llamada real al modelo, con la forma que espera `runAdviceChain`. Lanza si no
 * hay clave o si el modelo falla, que es justo lo que hace a la cadena pasar al
 * siguiente.
 */
export const callGemini: AdviceModelCall = async (model, prompt) => {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY no está configurada')

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: supportsStructuredOutput(model)
      ? { responseMimeType: 'application/json', responseSchema: ADVICE_SCHEMA }
      : undefined,
  })
  return response.text ?? ''
}
