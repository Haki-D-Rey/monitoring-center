
// ==============================================
// src/services/permissionService.ts
// ==============================================
import prisma from "@app-utils/prisma";
import type { Prisma } from "@prisma/client";
import { Filters } from "@src/types/pagination";
import type {
  PermissionSafeDTO,
  PermissionCreateDTO,
  PermissionUpdateDTO,
  PermissionPage,
  PermissionFilters,
} from "@src/types/permission";
import { clampInt, parseBool, parseDateOnly } from "@src/utils/parse";

// ---- Select tipado reutilizable ----
const permissionSelect = {
  id: true,
  name: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

type PermissionSelected = Prisma.PermissionGetPayload<{ select: typeof permissionSelect }>;

const toPermissionSafe = (p: PermissionSelected): PermissionSafeDTO => ({
  id: p.id,
  name: p.name,
  status: p.status,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt ?? undefined,
});

// 1) Define el conjunto de claves válidas para ordenar
type PermissionSortable = 'id' | 'name' | 'status' | 'createdAt' | 'updatedAt';
const allowedSorts = new Set<PermissionSortable>(['id', 'name', 'status', 'createdAt', 'updatedAt']);

export const permissionService = {
  // Listado con paginación y filtros básicos
  getAll: async (
    page = 1,
    pageSize = 1000,
    filters: PermissionFilters = {}
  ): Promise<{ data: PermissionPage[]; total: number; page: number; pageSize: number }> => {
    // ---- PAGINACIÓN ----
    const _page = clampInt(page, 1, 1_000_000);
    const _pageSize = clampInt(pageSize, 1, 1_000);

    // ---- WHERE ----
    const where: Prisma.PermissionWhereInput = {};

    // Búsqueda flexible: search | q | name
    const search = (filters.search ?? filters.q ?? (filters as PermissionFilters).name)?.toString()?.trim();
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const isPermissionSortKey = (k: unknown): k is PermissionSortable => {
      return typeof k === 'string' && allowedSorts.has(k as PermissionSortable);
    }

    // Filtro por estado
    const status = parseBool((filters as Filters).status);
    if (typeof status === 'boolean') where.status = status;

    // Rango de fechas por createdAt (opcional)
    const createdRange = (filters as Filters).createdAt;
    if (createdRange && (createdRange.from || createdRange.to)) {
      const from = parseDateOnly(createdRange.from);
      const to = parseDateOnly(createdRange.to);
      const createdAt: Prisma.DateTimeFilter = {};
      if (from) {
        const d = new Date(from);
        d.setHours(0, 0, 0, 0);
        createdAt.gte = d;
      }
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        createdAt.lte = d;
      }
      where.createdAt = createdAt;
    }

    // ---- ORDEN ----
    let orderBy: Prisma.PermissionOrderByWithRelationInput = { id: 'desc' };

    const sortBy = (filters as PermissionFilters | undefined)?.sortBy;
    const sortDir: Prisma.SortOrder =
      (filters as PermissionFilters | undefined)?.sortDir === 'asc' ? 'asc' : 'desc';

    if (isPermissionSortKey(sortBy)) {
      orderBy = { [sortBy]: sortDir } as Prisma.PermissionOrderByWithRelationInput;
    }

    // ---- QUERY ----
    const [total, rows] = await Promise.all([
      prisma.permission.count({ where }),
      prisma.permission.findMany({
        where,
        skip: (_page - 1) * _pageSize,
        take: _pageSize,
        orderBy,
        select: permissionSelect,
      }),
    ]);

    return {
      data: rows.map(toPermissionSafe),
      total,
      page: _page,
      pageSize: _pageSize,
    };
  },

  getById: async (id: number): Promise<PermissionSafeDTO | null> => {
    const p = await prisma.permission.findUnique({ where: { id }, select: permissionSelect });
    return p ? toPermissionSafe(p) : null;
  },

  create: async (data: PermissionCreateDTO): Promise<PermissionSafeDTO> => {
    const created = await prisma.permission.create({
      data: { name: data.name, status: data.status ?? true },
      select: permissionSelect,
    });
    return toPermissionSafe(created);
  },

  update: async (id: number, data: PermissionUpdateDTO): Promise<PermissionSafeDTO> => {
    const updated = await prisma.permission.update({
      where: { id },
      data,
      select: permissionSelect,
    });
    return toPermissionSafe(updated);
  },

  remove: async (id: number): Promise<void> => {
    // Soft delete
    await prisma.permission.update({ where: { id }, data: { status: false } });
  },
};
