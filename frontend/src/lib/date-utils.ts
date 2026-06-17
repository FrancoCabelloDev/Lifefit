const LOCALE = 'es-PE'

/** "15 ene 2024" */
export function formatDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')) : dateStr
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "15 ene" */
export function formatDateShort(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')) : dateStr
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })
}

/** "15 ene 2024 10:30" */
export function formatDateTime(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** "lunes 15 de enero" */
export function formatDateLong(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')) : dateStr
  return d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })
}

/** "S/ 1,200" */
export function formatCurrency(value: number): string {
  return `S/ ${value.toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/** "S/ 1,200.50" */
export function formatCurrencyDecimal(value: number): string {
  return `S/ ${value.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
