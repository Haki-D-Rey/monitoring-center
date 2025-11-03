// ==============================================
// src/services/roleService.ts
// ==============================================
import prisma from "@app-utils/prisma";
import type { Prisma } from "@prisma/client";
import type {
  RoleSafeDTO,
  RoleCreateDTO,
  RoleUpdateDTO,
  RolePage,
  RoleHasPermissionDTO,
  RoleFilters,
  PermissionSafeDTO,
} from "@app-types/role";
import { clampInt, parseBool, parseDateOnly } from "@src/utils/parse";
import { Filters } from "@src/types/pagination";

/** --- Selects reutilizables --- */
const permissionSafeSelect = {
  id: true,
  name: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const roleSelect = {
  id: true,
  name: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  permissions: {
    where: { status: true }, // <- quita esta línea si quieres TODOS (activos e inactivos)
    select: {
      permission: {
        select: permissionSafeSelect
      },
    },
  },
} as const;

type RoleSelected = Prisma.RoleGetPayload<{ select: typeof roleSelect }>;

const roleHasPermissionSelect = {
  id: true,
  roleId: true,
  permissionId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

type RoleHasPermissionSelected = Prisma.RoleHasPermissionGetPayload<{
  select: typeof roleHasPermissionSelect;
}>;

// 1) Define el conjunto de claves válidas para ordenar
type RoleSortable = 'id' | 'name' | 'status' | 'createdAt' | 'updatedAt';
const allowedSorts = new Set<RoleSortable>(['id', 'name', 'status', 'createdAt', 'updatedAt']);

/** ---- Mappers ---- */
const toRoleSafe = (r: RoleSelected): RoleSafeDTO => ({
  id: r.id,
  name: r.name,
  status: r.status,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt ?? undefined,
  permissions: (r.permissions ?? []).map(p => {
    const perm = p.permission;
    return {
      id: perm.id,
      name: perm.name,
      status: perm.status,
      createdAt: perm.createdAt,
      updatedAt: perm.updatedAt ?? undefined,
    } satisfies PermissionSafeDTO;
  }),
});

const toRoleHasPermission = (rp: RoleHasPermissionSelected): RoleHasPermissionDTO => ({
  id: rp.id,
  roleId: rp.roleId,
  permissionId: rp.permissionId,
  status: rp.status,
  createdAt: rp.createdAt,
  updatedAt: rp.updatedAt ?? undefined,
});


export const roleService = {
  // Listado con paginación y filtros básicos
  getAll: async (
    page = 1,
    pageSize = 20,
    filters: RoleFilters = {}
  ): Promise<{ data: RolePage[]; total: number; page: number; pageSize: number }> => {
    // ---- PAGINACIÓN ----
    const _page = clampInt(page, 1, 1_000_000);
    const _pageSize = clampInt(pageSize, 1, 1_000);

    // ---- WHERE ----
    const where: Prisma.RoleWhereInput = {};

    // Búsqueda flexible: search | q | name
    const search = (filters.search ?? filters.q ?? (filters as RoleFilters).name)?.toString()?.trim();
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const isRoleSortKey = (k: unknown): k is RoleSortable => {
      return typeof k === 'string' && allowedSorts.has(k as RoleSortable);
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
    let orderBy: Prisma.RoleOrderByWithRelationInput = { id: 'desc' };

    const sortBy = (filters as RoleFilters | undefined)?.sortBy;
    const sortDir: Prisma.SortOrder =
      (filters as RoleFilters | undefined)?.sortDir === 'asc' ? 'asc' : 'desc';

    if (isRoleSortKey(sortBy)) {
      orderBy = { [sortBy]: sortDir } as Prisma.RoleOrderByWithRelationInput;
    }

    // ---- QUERY ----
    const [total, rows] = await Promise.all([
      prisma.role.count({ where }),
      prisma.role.findMany({
        where,
        skip: (_page - 1) * _pageSize,
        take: _pageSize,
        orderBy,
        select: roleSelect,
      }),
    ]);

    return {
      data: rows.map(toRoleSafe),
      total,
      page: _page,
      pageSize: _pageSize,
    };
  },

  getById: async (id: number): Promise<RoleSafeDTO | null> => {
    const r = await prisma.role.findUnique({ where: { id }, select: roleSelect });
    return r ? toRoleSafe(r) : null;
  },

  create: async (data: RoleCreateDTO): Promise<RoleSafeDTO> => {
    const created = await prisma.role.create({
      data: {
        name: data.name,
        status: data.status ?? true,
      },
      select: roleSelect,
    });
    return toRoleSafe(created);
  },

  update: async (id: number, data: RoleUpdateDTO): Promise<RoleSafeDTO> => {
    const { permissions, ...roleData } = data;

    return await prisma.$transaction(async (tx) => {
      // 1) Actualiza campos base del rol (o valida existencia)
      if (Object.keys(roleData).length) {
        await tx.role.update({ where: { id }, data: roleData, select: { id: true } });
      } else {
        await tx.role.findUniqueOrThrow({ where: { id }, select: { id: true } });
      }

      // 2) Si viene "permissions", sincroniza la pivote RoleHasPermission
      if (Array.isArray(permissions)) {
        // normaliza ids
        const want = Array.from(new Set(permissions.map(Number).filter(Number.isFinite))) as number[];

        // lee lo que existe
        const existing = await tx.roleHasPermission.findMany({
          where: { roleId: id },
          select: { permissionId: true, status: true },
        });

        const existingMap = new Map<number, boolean>();
        for (const e of existing) existingMap.set(e.permissionId, e.status);

        const wantSet = new Set(want);
        const toCreate: number[] = [];
        const toActivate: number[] = [];
        const toDeactivate: number[] = [];

        // crear/activar los solicitados
        for (const pid of want) {
          if (!existingMap.has(pid)) toCreate.push(pid);
          else if (existingMap.get(pid) === false) toActivate.push(pid);
        }

        // desactivar los que ya no están
        for (const { permissionId, status } of existing) {
          if (!wantSet.has(permissionId) && status === true) toDeactivate.push(permissionId);
        }

        if (toCreate.length) {
          await tx.roleHasPermission.createMany({
            data: toCreate.map((permissionId) => ({ roleId: id, permissionId, status: true })),
            skipDuplicates: true,
          });
        }
        if (toActivate.length) {
          await tx.roleHasPermission.updateMany({
            where: { roleId: id, permissionId: { in: toActivate } },
            data: { status: true },
          });
        }
        if (toDeactivate.length) {
          await tx.roleHasPermission.updateMany({
            where: { roleId: id, permissionId: { in: toDeactivate } },
            data: { status: false },
          });
        }
      }

      // 3) Devuelve el rol con permisos planos
      const final = await tx.role.findUnique({ where: { id }, select: roleSelect });
      if (!final) throw new Error('Role not found after update');
      return toRoleSafe(final);
    });
  },

  remove: async (id: number): Promise<RoleSafeDTO> => {
    const updated = await prisma.role.update({
      where: { id },
      data: { status: false },
      select: roleSelect,
    });
    return toRoleSafe(updated);
  },

  // relaciones
  assignPermission: async (roleId: number, permissionId: number): Promise<RoleHasPermissionDTO> => {
    const created = await prisma.roleHasPermission.create({
      data: { roleId, permissionId, status: true },
      select: roleHasPermissionSelect,
    });
    return toRoleHasPermission(created);
  },

  removePermission: async (roleId: number, permissionId: number): Promise<RoleHasPermissionDTO> => {
    // Si prefieres 204 sin body, cambia el tipo a Promise<void> y no retornes nada.
    const deleted = await prisma.roleHasPermission.update({
      where: { roleId_permissionId: { roleId, permissionId } },
      data: { status: false },
      select: roleHasPermissionSelect,
    });
    return toRoleHasPermission(deleted);
  },
  updateStatus: async (id: number, status: boolean) => {
    try {
      const updated = await prisma.role.update({
        where: { id },
        data: { status },
        select: roleSelect,
      });
      return toRoleSafe(updated);
    } catch {
      return null;
    }
  },

  /** Cambia estado en lote; devuelve conteo */
  bulkUpdateStatus: async (ids: number[], status: boolean) => {
    const result = await prisma.role.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    return result;
  },
};
