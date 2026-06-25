/**
 * Transferencia de datos: serialización e importación del localStorage.
 *
 * El usuario puede exportar todo su localStorage a un archivo .txt (JSON) y
 * volver a importarlo en otro dispositivo. Esto permite sincronizar manualmente
 * preferencias y datos guardados sin necesidad de inicio de sesión.
 */

/** Mapa plano clave → valor tal como lo almacena el navegador. */
export type StorageSnapshot = Record<string, string>

export type ParseResult =
  | { ok: true; data: StorageSnapshot; keyCount: number }
  | { ok: false; error: string }

/** Recolecta todas las entradas actuales del localStorage. */
export function collectLocalStorage(storage: Storage = localStorage): StorageSnapshot {
  const snapshot: StorageSnapshot = {}
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key === null) continue
    const value = storage.getItem(key)
    if (value === null) continue
    snapshot[key] = value
  }
  return snapshot
}

/** Genera el contenido del archivo de exportación (JSON con sangría). */
export function serializeExport(snapshot: StorageSnapshot): string {
  return JSON.stringify(snapshot, null, 2)
}

/** Construye un nombre de archivo como `bolivar-convert-data-2026-06-25.txt`. */
export function buildExportFilename(date: Date = new Date()): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `bolivar-convert-data-${yyyy}-${mm}-${dd}.txt`
}

/**
 * Valida y parsea el contenido de un archivo importado. Solo acepta un objeto
 * JSON plano cuyos valores sean todos strings (la forma real del localStorage).
 */
export function parseImport(text: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'El archivo no contiene un JSON válido.' }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'El archivo no tiene el formato esperado.' }
  }

  const entries = Object.entries(parsed as Record<string, unknown>)

  if (entries.length === 0) {
    return { ok: false, error: 'El archivo no contiene datos para importar.' }
  }

  for (const [key, value] of entries) {
    if (typeof value !== 'string') {
      return {
        ok: false,
        error: `El valor de la clave "${key}" no es válido.`,
      }
    }
  }

  const data = Object.fromEntries(entries) as StorageSnapshot
  return { ok: true, data, keyCount: entries.length }
}

/**
 * Borra TODO el localStorage previo y escribe el snapshot importado.
 * Nota: tras llamar a esto hay que recargar la página para que los hooks
 * re-hidraten su estado desde el localStorage.
 */
export function applyImport(snapshot: StorageSnapshot, storage: Storage = localStorage): void {
  storage.clear()
  for (const [key, value] of Object.entries(snapshot)) {
    storage.setItem(key, value)
  }
}
