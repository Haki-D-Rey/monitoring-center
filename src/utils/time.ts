import moment from "moment-timezone";

const DEFAULT_TZ = "America/Guatemala";

// Convierte Date | string | number a string en la TZ dada (ISO con offset)
export function toTZ(
  value: Date | string | number | null | undefined,
  tz: string = DEFAULT_TZ,
  format: string = "YYYY-MM-DD[T]HH:mm:ssZ" // 2025-10-15T09:12:34-06:00
): string | null {
  if (value == null) return null;

  // moment maneja Date, ISO string, epoch, etc.
  const m = moment(value);
  if (!m.isValid()) return null;

  return m.tz(tz).format(format);
}
