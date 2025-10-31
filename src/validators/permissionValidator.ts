// src/validators/permissionValidator.ts
import { z } from "zod";

export const listPermissionsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(200).default(20),
    q: z.string().trim().optional(),
    status: z.preprocess(
      v => (v === "true" || v === true) ? true : (v === "false" || v === false) ? false : undefined,
      z.boolean().optional()
    ),
  }),
});

export const createPermissionSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    status: z.boolean().optional(),
  }),
});

export const updatePermissionSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    name: z.string().min(2).optional(),
    status: z.boolean().optional(),
  }),
});

export const removePermissionSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});
