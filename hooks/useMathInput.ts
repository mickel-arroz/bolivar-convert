'use client'

import { useEffect, useState } from 'react'
import {
  evaluateExpression,
  hasMathOperator,
  sanitizeExpression,
  formatEvaluated,
} from '@/lib/mathExpression'

interface UseMathInputOptions {
  /** Decimales máximos del resultado al normalizar (default 2). */
  maxDecimals?: number
  /** Largo máximo de la expresión escrita (default 32). */
  maxLen?: number
}

/**
 * Convierte cualquier input numérico en una mini-calculadora: el usuario puede
 * escribir expresiones simples ("10+5", "12*1,16", "(3-1)/4") y el campo evalúa
 * el resultado. El componente padre siempre recibe un string numérico plano
 * (apto para `parseFloat`); la expresión solo vive en el estado local de edición.
 *
 * Devuelve además `showPreview`/`evaluated` para mostrar el resultado en vivo
 * (p. ej. alineado a la derecha, en la fila del label).
 */
export function useMathInput(
  value: string,
  onValueChange: (numeric: string) => void,
  { maxDecimals = 2, maxLen = 32 }: UseMathInputOptions = {}
) {
  // Texto en edición: puede ser una expresión mientras el usuario escribe.
  const [text, setText] = useState(value)
  const [focused, setFocused] = useState(false)

  // Sincroniza desde el padre cuando el campo no está enfocado (carga externa,
  // valor elegido por la calculadora, etc.) o cuando se resetea a vacío aunque
  // siga enfocado (p. ej. "agregar ítem" limpia el campo y mantiene el foco).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!focused || value === '') setText(value)
  }, [value, focused])

  const evaluated = evaluateExpression(text)
  const showPreview = hasMathOperator(text) && evaluated !== null

  const handleChange = (raw: string) => {
    const sanitized = sanitizeExpression(raw, maxLen)
    setText(sanitized)
    const result = evaluateExpression(sanitized)
    if (result !== null) {
      onValueChange(formatEvaluated(result, maxDecimals))
    } else if (sanitized.trim() === '') {
      onValueChange('')
    }
  }

  const handleBlur = () => {
    // Al salir, normaliza la expresión al número resultante para que lo mostrado
    // coincida con lo almacenado.
    const result = evaluateExpression(text)
    if (result !== null) {
      const formatted = formatEvaluated(result, maxDecimals)
      setText(formatted)
      onValueChange(formatted)
    } else if (text.trim() === '') {
      onValueChange('')
    }
    setFocused(false)
  }

  return {
    /** Valor a mostrar en el input (la expresión en edición). */
    text,
    /** Resultado numérico evaluado (o null si es inválido/incompleto). */
    evaluated,
    /** True cuando hay una expresión con operadores que se está evaluando. */
    showPreview,
    /** Props para enlazar directamente al `<input>`/`<Input>`. */
    inputProps: {
      type: 'text' as const,
      inputMode: 'decimal' as const,
      autoComplete: 'off',
      value: text,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleChange(e.target.value),
      onFocus: () => setFocused(true),
      onBlur: handleBlur,
    },
  }
}

/** Formatea el resultado evaluado para la vista previa "= N". */
export function formatPreview(value: number, maxDecimals = 2): string {
  return value.toLocaleString('es-VE', { maximumFractionDigits: maxDecimals })
}
