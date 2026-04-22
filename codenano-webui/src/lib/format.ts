/** Truncate the first user message into a chat title. */
export function deriveTitle(preview: string | undefined, fallback: string): string {
  if (!preview) return fallback
  const oneLine = preview.replace(/\s+/g, ' ').trim()
  if (!oneLine) return fallback
  return oneLine.length > 60 ? `${oneLine.slice(0, 57)}…` : oneLine
}

/** Loose ISO-or-epoch parser; returns null for missing/invalid input. */
function parseDate(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

const RELATIVE_THRESHOLDS: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [7, 'day'],
  [4.345, 'week'],
  [12, 'month'],
  [Number.POSITIVE_INFINITY, 'year'],
]

const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>()

export function relativeTime(
  value: string | number | null | undefined,
  locale?: string,
): string {
  const date = parseDate(value)
  if (!date) return ''
  let delta = (date.getTime() - Date.now()) / 1000
  const lang = locale || 'en'
  let formatter = relativeTimeFormatters.get(lang)
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
    relativeTimeFormatters.set(lang, formatter)
  }
  for (const [step, unit] of RELATIVE_THRESHOLDS) {
    if (Math.abs(delta) < step) {
      return formatter.format(Math.round(delta), unit)
    }
    delta /= step
  }
  return formatter.format(Math.round(delta), 'year')
}
