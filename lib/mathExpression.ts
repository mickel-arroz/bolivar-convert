/**
 * Evaluador seguro de expresiones aritméticas simples (sin `eval`).
 *
 * Soporta: números decimales (con `.` o `,`), operadores `+ - * /`, paréntesis y
 * signos unarios. No admite variables ni funciones. Devuelve `null` si la expresión
 * es inválida, incompleta o produce un resultado no finito (p. ej. división por 0).
 *
 * Uso: el input del conversor permite escribir "1 + 2", "10*1,5", "(3-1)/4", etc.
 */

type Token =
  | { type: 'num'; value: number }
  | { type: 'op'; value: '+' | '-' | '*' | '/' }
  | { type: 'paren'; value: '(' | ')' }

const PRECEDENCE: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 }

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = []
  let i = 0
  const s = input

  while (i < s.length) {
    const ch = s[i]

    if (ch === ' ' || ch === '\t') {
      i++
      continue
    }

    if (ch >= '0' && ch <= '9') {
      let num = ''
      while (i < s.length && s[i] >= '0' && s[i] <= '9') num += s[i++]
      if (s[i] === '.') {
        num += '.'
        i++
        while (i < s.length && s[i] >= '0' && s[i] <= '9') num += s[i++]
      }
      tokens.push({ type: 'num', value: parseFloat(num) })
      continue
    }

    // Número que empieza con punto: ".5"
    if (ch === '.') {
      let num = '.'
      i++
      while (i < s.length && s[i] >= '0' && s[i] <= '9') num += s[i++]
      if (num === '.') return null
      tokens.push({ type: 'num', value: parseFloat(num) })
      continue
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch })
      i++
      continue
    }

    return null // carácter no permitido
  }

  return tokens
}

/** Convierte a RPN (shunting-yard) resolviendo signos unarios. */
function toRpn(tokens: Token[]): Token[] | null {
  const output: Token[] = []
  const stack: Token[] = []
  let prev: Token | null = null

  for (const tok of tokens) {
    if (tok.type === 'num') {
      output.push(tok)
    } else if (tok.type === 'op') {
      // Signo unario: al inicio, tras otro operador o tras '('
      const isUnary =
        prev === null ||
        (prev.type === 'op') ||
        (prev.type === 'paren' && prev.value === '(')
      if (isUnary) {
        if (tok.value === '-') {
          // Representa el unario menos como (0 - x) inyectando un 0 y el operador.
          output.push({ type: 'num', value: 0 })
          stack.push({ type: 'op', value: '-' })
        } else if (tok.value === '+') {
          // Unario '+' no hace nada.
        } else {
          return null // '*' o '/' no pueden ser unarios
        }
      } else {
        while (
          stack.length > 0 &&
          stack[stack.length - 1].type === 'op' &&
          PRECEDENCE[(stack[stack.length - 1] as { value: string }).value] >=
            PRECEDENCE[tok.value]
        ) {
          output.push(stack.pop()!)
        }
        stack.push(tok)
      }
    } else if (tok.value === '(') {
      stack.push(tok)
    } else {
      // ')'
      let foundParen = false
      while (stack.length > 0) {
        const top = stack.pop()!
        if (top.type === 'paren' && top.value === '(') {
          foundParen = true
          break
        }
        output.push(top)
      }
      if (!foundParen) return null // paréntesis desbalanceados
    }
    prev = tok
  }

  while (stack.length > 0) {
    const top = stack.pop()!
    if (top.type === 'paren') return null // paréntesis sin cerrar
    output.push(top)
  }

  return output
}

function evalRpn(rpn: Token[]): number | null {
  const stack: number[] = []
  for (const tok of rpn) {
    if (tok.type === 'num') {
      stack.push(tok.value)
    } else if (tok.type === 'op') {
      const b = stack.pop()
      const a = stack.pop()
      if (a === undefined || b === undefined) return null
      let r: number
      switch (tok.value) {
        case '+':
          r = a + b
          break
        case '-':
          r = a - b
          break
        case '*':
          r = a * b
          break
        case '/':
          if (b === 0) return null
          r = a / b
          break
      }
      stack.push(r)
    } else {
      return null
    }
  }
  if (stack.length !== 1) return null
  const result = stack[0]
  return Number.isFinite(result) ? result : null
}

/**
 * Evalúa una expresión aritmética simple. Devuelve el número resultante o `null`
 * si la entrada está vacía, es inválida o no produce un valor finito.
 */
export function evaluateExpression(input: string): number | null {
  if (!input) return null
  const normalized = input.replace(/,/g, '.').trim()
  if (normalized === '') return null

  const tokens = tokenize(normalized)
  if (!tokens || tokens.length === 0) return null

  const rpn = toRpn(tokens)
  if (!rpn || rpn.length === 0) return null

  return evalRpn(rpn)
}

/** True si la expresión contiene algún operador aritmético (para la vista previa). */
export function hasMathOperator(input: string): boolean {
  return /[+\-*/]/.test(input.replace(/^\s*-/, '')) // ignora un signo negativo inicial
}

/** Deja solo dígitos, separadores decimales, operadores y paréntesis. */
export function sanitizeExpression(input: string, maxLen = 32): string {
  return input.replace(/[^0-9.,+\-*/() ]/g, '').slice(0, maxLen)
}

/**
 * Formatea el resultado de una expresión como string numérico plano (con `.` decimal,
 * sin separadores de miles), listo para almacenar y volver a parsear con `parseFloat`.
 */
export function formatEvaluated(n: number, maxDecimals = 2): string {
  return String(Number(n.toFixed(maxDecimals)))
}
