// src/validators/roleValidator.ts
import { z } from "zod";

/** Helpers reutilizables */
export const booleanish = z.union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => (v === true || v === "true" || v === "1"));

const toBoolean = z.preprocess((v) => {
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(s)) return true;
    if (["false", "0", "no", "n", "off"].includes(s)) return false;
  }
  return v;
}, z.boolean());

/** Campos válidos para ordenar roles */
export const roleSortFields = ["id", "name", "status", "createdAt", "updatedAt"] as const;

/** Filtros específicos para roles */
export const roleFiltersSchema = z.object({
  status: booleanish.optional(),
  name: z.string().trim().optional(),
  createdAt: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }).partial().optional(),
}).default({});


export const roleQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    perPage: z.coerce.number().int().positive().max(200).default(20),

    sortBy: z.enum(roleSortFields).default("createdAt"),
    sortDir: z.enum(["asc", "desc"]).default("asc"),

    search: z.string().trim().optional(),
    q: z.string().trim().optional(),
    status: booleanish.optional(),
    filters: roleFiltersSchema,
  })
    .transform((q) => {
      const search = q.search ?? q.q ?? "";

      const filters = { ...q.filters };
      if (q.status !== undefined && filters.status === undefined) {
        filters.status = q.status;
      }

      if (search && !filters.name) {
        filters.name = search;
      }

      return {
        page: q.page,
        perPage: q.perPage,
        sortBy: q.sortBy,
        sortDir: q.sortDir,
        search,
        filters,
      };
    }),
});

export type RoleQuery = z.infer<typeof roleQuerySchema>["query"];


/* ===================== */
/*  Body (Create/Update) */
/* ===================== */

export const roleBaseSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(80),
  status: toBoolean.default(true),
  permissions: z.array(z.union([z.number().int().positive(), z.string().trim()])).default([]),
});

export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    status: z.boolean(),
  }),
});;

export const updateRoleSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    name: z.string().min(1),
    status: z.boolean(),
    permissions: z.array(z.coerce.number().int().positive()).optional(),
  }),
});

export const removeRoleSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

export const assignPermissionSchema = z.object({
  body: z.object({
    roleId: z.coerce.number().int().positive(),
    permissionId: z.coerce.number().int().positive(),
  }),
});

export const removePermissionSchema = assignPermissionSchema;

export const updateRoleStatusSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    status: z.boolean(),
  }),
});

export const bulkUpdateRoleStatusSchema = z.object({
  body: z.object({
    ids: z.array(z.coerce.number().int().positive()).min(1, "Debes enviar al menos un id"),
    status: z.boolean(),
  }),
});
