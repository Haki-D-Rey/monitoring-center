/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import type { ValidatedRequest, ZodSchemaLike } from "@app-types/validation";
import { foldBracketFilters, mergeQueryJson } from "@src/utils/parse";

const FILTER_BRACKET_RE = /^filters\[/; // cacheado para performance

export const validate =
  <TSchema extends ZodSchemaLike>(schema: TSchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1) Normaliza JSON en query/body/params (ej. ?filters={"status":true})
      const raw = { body: req.body, params: req.params, query: req.query };
      const input = mergeQueryJson(raw, { onError: "throw" });

      // 2) Plegar filters[...] -> query.filters y limpiar basura
      const q = (input.query ?? {}) as Record<string, unknown>;
      if (q && typeof q === "object") {
        const folded = foldBracketFilters(q); // { status: true, createdAt: {from,to}, ... }
        if (folded && Object.keys(folded).length) {
          // Combinar con filters existente si venía como objeto
          const existingFilters =
            (q.filters && typeof q.filters === "object" ? (q.filters as Record<string, unknown>) : {}) || {};
          q.filters = { ...existingFilters, ...folded };

          // Eliminar claves "filters[...]" del nivel raíz para no duplicar
          for (const k of Object.keys(q)) {
            if (FILTER_BRACKET_RE.test(k)) delete q[k];
          }
        }
      }

      // 3) Preparar qué partes validar según el shape del schema
      const sAny = schema as any;
      const hasQuery = !!sAny.shape?.query;
      const hasParams = !!sAny.shape?.params;
      const hasBody = !!sAny.shape?.body;

      const out: any = {};
      const errs: any = {};

      // 4) Valida cada sección solo si el schema la define
      if (hasQuery) {
        const r = await sAny.shape.query.safeParseAsync(input.query);
        if (r.success) out.query = r.data;
        else errs.query = r.error.flatten ? r.error.flatten() : r.error;
      }
      if (hasParams) {
        const r = await sAny.shape.params.safeParseAsync(input.params);
        if (r.success) out.params = r.data;
        else errs.params = r.error.flatten ? r.error.flatten() : r.error;
      }
      if (hasBody) {
        const r = await sAny.shape.body.safeParseAsync(input.body);
        if (r.success) out.body = r.data;
        else errs.body = r.error.flatten ? r.error.flatten() : r.error;
      }

      // 5) Si no hay secciones definidas en el schema, valida el objeto completo
      if (!hasQuery && !hasParams && !hasBody) {
        const r = await (schema as any).safeParseAsync(input);
        if (!r.success) return res.status(400).json({ errors: r.error.flatten() });
        (req as any).validated = r.data;
        return next();
      }

      if (Object.keys(errs).length) {
        return res.status(400).json({ errors: errs });
      }

      (req as ValidatedRequest<TSchema>).validated = out;
      next();
    } catch (err: any) {
      return res
        .status(err?.status ?? 500)
        .json({ error: err?.message ?? "Validation error" });
    }
  };
