import { z } from "zod";

export const createUserSchema = z.object({
    body: z.object({
        email: z.string().email().transform(v => v.trim().toLowerCase()),
        password: z.string().min(6),
        roleId: z.number().int().positive().optional(),
        status: z.boolean().optional(),
        refreshToken: z.string().nullable().optional(),
    }),
});


export const updateUserSchema = z.object({
    params: z.object({ id: z.string().regex(/^\d+$/) }),
    body: z
        .object({
            email: z.string().email().optional(),
            password: z.string().min(8).optional(),
            roleId: z.number().int().positive().optional(),
            status: z.boolean().optional(),
            refreshToken: z.string().nullable().optional(),
        })
        .refine((data) => Object.keys(data).length > 0, {
            message: "Debe enviar al menos un campo para actualizar",
        }),
});


export const removeUserSchema = z.object({
    params: z.object({ id: z.string().regex(/^\d+$/) }),
});


export const changePasswordSchema = z.object({
    params: z.object({
        id: z.coerce.number().int().positive(),
    }),
    body: z.object({
        password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    }),
});


export const verifyPasswordSchema = z.object({
    body: z.object({
        password: z.string().min(1, 'La contraseña es obligatoria'),
    }),
});


export const updateRoleSchema = z.object({
    params: z.object({ id: z.string().regex(/^\d+$/) }),
    body: z.object({ roleId: z.number().int().positive() }),
});


export const linkProfileSchema = z.object({
    params: z.object({ id: z.string().regex(/^\d+$/) }),
    body: z.object({ profileId: z.number().int().positive() }),
});


export const unlinkProfileSchema = z.object({
    params: z.object({ id: z.string().regex(/^\d+$/) }),
});


// helpers de coerción
const booleanish = z.preprocess((v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
        const s = v.toLowerCase();
        if (s === "true" || s === "1") return true;
        if (s === "false" || s === "0") return false;
    }
    return v;
}, z.boolean());

const numberish = z.preprocess((v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "") return Number(v);
    return v;
}, z.number());

// yyyy-mm-dd (simple y suficiente para tu UI)
const dateISO = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD");

// rango de fechas { from?, to? }
const rangeDate = z.object({
    from: dateISO.optional(),
    to: dateISO.optional(),
});

// un filtro puede ser string | number | boolean | rango fecha
const filterValue = z.union([z.string(), numberish, booleanish, rangeDate]);

// record de filtros: { [clave: string]: filterValue | null | undefined }
const filtersSchema = z
    .record(z.string(), z.union([filterValue, z.null(), z.undefined()]))
    .default({});

export const paginationQuerySchema = z.object({
    query: z
        .object({
            page: z.coerce.number().int().positive().default(1),
            perPage: z.coerce.number().int().positive().max(200).default(20),

            // orden
            sortBy: z.string().trim().optional().default(""),
            sortDir: z.enum(["asc", "desc"]).default("asc"),

            // búsqueda (acepta 'search' o 'q')
            search: z.string().trim().optional(),
            q: z.string().trim().optional(),

            // atajos sueltos (opcionales)
            status: booleanish.optional(),
            roleId: z.coerce.number().int().positive().optional(),

            // filtros anidados desde el cliente: filters[clave]=... o filters[clave][from]/[to]
            filters: filtersSchema,
        })
        .transform((q) => {
            // normaliza 'search'
            const search = q.search ?? q.q ?? "";

            // mueve 'status' suelto a filters.status si no vino en filters
            const filters = { ...q.filters };
            if (q.status !== undefined && filters.status === undefined) {
                filters.status = q.status;
            }
            if (q.roleId !== undefined && filters.roleId === undefined) {
                filters.roleId = q.roleId;
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

export type PaginationQuery = z.infer<typeof paginationQuerySchema>["query"];

export const updateUserStatusSchema = z.object({
    params: z.object({
        id: z.coerce.number().int().positive(),
    }),
    body: z.object({
        status: z.boolean(),
    }),
});

export const bulkUpdateUserStatusSchema = z.object({
    body: z.object({
        ids: z.array(z.coerce.number().int().positive()).min(1, "Debes enviar al menos un id"),
        status: z.boolean(),
    }),
});
