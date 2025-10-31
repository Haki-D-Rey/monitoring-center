/* eslint-disable @typescript-eslint/no-explicit-any */
// src/controllers/_base/PaginatedController.ts
import type { Request, Response } from "express";
import type { ListParams, PageFetchResult, ServerResponse } from "../../types/pagination";

type CoreKeys = "page" | "pageSize" | "perPage" | "sortBy" | "sortDir" | "search" | "q";
export type FiltersOf<TQuery extends Record<string, unknown>> = Omit<TQuery, CoreKeys>;

// 👇 alias útil para el diccionario de filtros resultante
type FiltersDict<TQuery extends Record<string, unknown>> =
  Partial<FiltersOf<TQuery>> & Record<string, unknown>;

// export type ListParams<F extends Record<string, unknown> = Record<string, unknown>> = {
//   page: number;
//   pageSize: number;
//   sortBy?: string;
//   sortDir?: "asc" | "desc";
//   search?: string;
//   filters: Partial<F> & Record<string, unknown>;
// };

export abstract class PaginatedController<
  TQuery extends Record<string, unknown>,
  TItem
> {
  protected abstract fetchPage(
    params: ListParams<FiltersOf<TQuery>>
  ): Promise<PageFetchResult<TItem>>;

  public getAll = async (req: Request, res: Response) => {
    const q = (req as any).validated?.query as Partial<TQuery> & {
      page?: number | string;
      pageSize?: number | string;
      perPage?: number | string;
      sortBy?: string;
      sortDir?: string;
      search?: string;
      q?: string;
    };

    const page = clampInt(q?.page ?? 1, 1, Infinity);
    const rawSize = (q?.pageSize ?? q?.perPage ?? 10);
    const pageSize = clampInt(rawSize, 1, 1000);

    const sortBy = asString(q?.sortBy);
    const sortDir = asSortDir(q?.sortDir);
    const search = asString(q?.search ?? q?.q) || undefined;

    // 👇 ahora devuelve el tipo correcto (FiltersDict<TQuery>)
    const filters = pickFilters<TQuery>(q);

    const result = await this.fetchPage({
      page,
      pageSize,
      sortBy,
      sortDir,
      search,
      filters,
    });

    const lastPage = Math.max(1, Math.ceil((result.total || 0) / (result.pageSize || pageSize)));

    const payload: ServerResponse<TItem> = {
      data: result.data,
      meta: {
        total: result.total,
        perPage: result.pageSize ?? pageSize,
        currentPage: result.page ?? page,
        lastPage,
      },
    };

    return res.json(payload);
  };
}

/** Helpers */
function clampInt(v: number | string | undefined, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asSortDir(v: unknown): "asc" | "desc" | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.toLowerCase();
  return s === "asc" || s === "desc" ? s : undefined;
}

/**
 * Extrae filtros “no core” y también une cualquier objeto `filters`
 * anidado. Retorna un FiltersDict<TQuery> para satisfacer el genérico.
 */
function pickFilters<TQuery extends Record<string, unknown>>(
  q: Partial<TQuery>
): FiltersDict<TQuery> {
  const core: Record<string, true> = {
    page: true,
    pageSize: true,
    perPage: true,
    sortBy: true,
    sortDir: true,
    search: true,
    q: true,
  };

  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(q ?? {})) {
    if (core[k]) continue;
    if (v === undefined) continue;

    if (k === "filters" && v && typeof v === "object") {
      Object.assign(out, v as object);
      continue;
    }
    out[k] = v;
  }

  // Cast controlado para cumplir con el tipo esperado por ListParams
  return out as FiltersDict<TQuery>;
}

/** Helper reutilizable para GET /:id */
export async function sendById<T>(
  req: Request,
  res: Response,
  fetcher: (id: number) => Promise<T | null>,
  notFoundMessage = "Resource not found"
) {
  const id = Number(req.params.id);
  const entity = await fetcher(id);
  if (!entity) return res.status(404).json({ error: notFoundMessage });
  return res.json(entity);
}

