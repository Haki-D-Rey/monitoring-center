/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response, NextFunction } from "express";
import moment from "moment-timezone";

// heurística básica para strings ISO (UTC) -> ajustarlas también
const ISO_UTC_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function transformDates(value: any, tz: string): any {
  if (value == null) return value;

  // 1) Date -> string en TZ
  if (value instanceof Date) {
    return moment(value).tz(tz).format("YYYY-MM-DD[T]HH:mm:ssZ");
  }

  // 2) String con pinta de ISO UTC -> pásala a TZ (opcional)
  if (typeof value === "string" && ISO_UTC_REGEX.test(value)) {
    const m = moment(value);
    if (m.isValid()) {
      return m.tz(tz).format("YYYY-MM-DD[T]HH:mm:ssZ");
    }
  }

  // 3) Array -> transforma elementos
  if (Array.isArray(value)) {
    return value.map((v) => transformDates(v, tz));
  }

  // 4) Objeto plano -> transforma propiedades
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = transformDates(v, tz);
    }
    return out;
  }

  return value;
}

/**
 * Middleware fábrica: envíale la TZ.
 * Convierte Date y strings ISO UTC a strings con offset en la zona indicada.
 */
export function formatDatesToTZ(tz = "America/Guatemala") {
  return (_req: Request, res: Response, next: NextFunction) => {
    const json = res.json.bind(res);
    res.json = (body: any) => json(transformDates(body, tz));
    next();
  };
}
