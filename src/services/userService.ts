/* eslint-disable @typescript-eslint/no-explicit-any */
// ==============================================
// src/services/userService.ts
// ==============================================
import bcrypt from "bcrypt";
import prisma from "@app-utils/prisma";
import type { Prisma } from "@prisma/client"; // ⬅️ tipos desde el namespace Prisma
import {
  UserCreateDTO,
  UserSafeDTO,
  UserUpdateDTO,
  UserWithProfileDTO,
} from "@app-types/user";
import { clampInt, parseBool, parseDateOnly } from "@src/utils/parse";
import { Filters } from "@src/types/pagination";

// ---- Selects tipados reutilizables ----
const userSelect = {
  id: true,
  email: true,
  roleId: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  refreshToken: true,
} as const;

type UserSelected = Prisma.UserGetPayload<{ select: typeof userSelect }>;

const profileSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  status: true,
} as const;

type UserWithProfileSelected = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    roleId: true;
    status: true;
    createdAt: true;
    updatedAt: true;
    refreshToken: true;
    role: {
      select: {
        id: true;
        name: true;
        status: true;
        createdAt: true;
      };
    };
    profile: { select: typeof profileSelect };
  };
}>;


const toSafe = (u: UserSelected): UserSafeDTO => ({
  id: u.id,
  email: u.email,
  roleId: u.roleId,
  role: u.role,
  status: u.status,
  createdAt: u.createdAt,
  ...(u.updatedAt ? { updatedAt: u.updatedAt } : {}),
  ...(u.refreshToken ? { refreshToken: u.refreshToken } : {}),
});



class AppError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const userService = {
  // Listado con paginación y filtros básicos
  getAll: async (
    page = 1,
    pageSize = 20,
    filters: Filters = {}
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number }> => {
    // Normaliza paginación
    const _page = clampInt(page, 1, 1_000_000);
    const _pageSize = clampInt(pageSize, 1, 1_000);

    // ---- WHERE ----
    const where: Prisma.UserWhereInput = {};

    const search = (filters.search ?? filters.q ?? filters.email)?.trim().toLocaleLowerCase();
    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }

    const status = parseBool(filters.status);
    if (typeof status === 'boolean') where.status = status;

    // ✅ Búsqueda parcial por nombre de rol (case-insensitive)
    const roleName =
      typeof filters?.role === "string" ? filters.role.trim() : "";
    if (roleName) {
      where.role = {
        is: {
          name: { contains: roleName, mode: "insensitive" },
        },
      };
    }

    // Rango de fechas por createdAt (si lo estás enviando como filters.createdAt)
    if (filters.createdAt && (filters.createdAt.from || filters.createdAt.to)) {
      const from = parseDateOnly(filters.createdAt.from);
      const to = parseDateOnly(filters.createdAt.to);
      if (from || to) {
        const createdAt: Prisma.DateTimeFilter = {};
        if (from) {
          // desde 00:00:00.000
          const d = new Date(from);
          d.setHours(0, 0, 0, 0);
          createdAt.gte = d;
        }
        if (to) {
          // hasta 23:59:59.999
          const d = new Date(to);
          d.setHours(23, 59, 59, 999);
          createdAt.lte = d;
        }
        where.createdAt = createdAt;
      }
    }

    // ---- ORDER BY ----
    const allowedSorts = new Set(['id', 'email', 'status', 'createdAt', 'updatedAt']);
    let orderBy: Prisma.UserOrderByWithRelationInput = { id: 'desc' };

    if (filters.sortBy && allowedSorts.has(filters.sortBy)) {
      const dir: 'asc' | 'desc' = filters.sortDir === 'asc' ? 'asc' : 'desc';
      orderBy = { [filters.sortBy]: dir } as Prisma.UserOrderByWithRelationInput;
    }

    // ---- QUERY ----
    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (_page - 1) * _pageSize,
        take: _pageSize,
        orderBy,
        select: userSelect, // ajusta al select seguro que ya usas
      }),
    ]);

    return { data: rows.map(toSafe), total, page: _page, pageSize: _pageSize };
  },

  getById: async (id: number): Promise<UserWithProfileDTO | null> => {
    const u: UserWithProfileSelected | null = await prisma.user.findUnique({
      where: { id },
      // ❗ Usa SOLO `select` y especifica todo lo que necesitas
      select: {
        id: true,
        email: true,
        roleId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        refreshToken: true,
        // relation: role
        role: {
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true
          },
        },
        // relation: profile
        profile: {
          select: profileSelect,
        },
      },
    });

    if (!u) return null;

    // Mapea a tu DTO "seguro"
    const safeBase: UserSafeDTO = {
      id: u.id,
      email: u.email,
      roleId: u.roleId,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      ...(u.updatedAt ? { updatedAt: u.updatedAt } : {}),
      ...(u.refreshToken ? { refreshToken: u.refreshToken } : {}),
    };

    const profile = u.profile
      ? {
        id: u.profile.id,
        firstName: u.profile.firstName,
        lastName: u.profile.lastName,
        email: u.profile.email,
        ...(u.profile.phone ? { phone: u.profile.phone } : {}),
        status: u.profile.status,
      }
      : null;

    const result: UserWithProfileDTO = {
      ...safeBase,
      profile,
    };

    return result;
  },

  getByEmail: async (email: string): Promise<UserSafeDTO | null> => {
    const u = await prisma.user.findUnique({ where: { email }, select: userSelect });
    return u ? toSafe(u) : null;
  },

  create: async (data: UserCreateDTO): Promise<UserSafeDTO> => {
    const { email, roleId, password, status, refreshToken } = data;
    const normalizedEmail = email.trim().toLowerCase();

    const existingEmail = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingEmail) {
      throw new AppError(409, 'El email ya existe');
    }

    const hash = await bcrypt.hash(password, 10);
    try {
      const created = await prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hash,
          roleId: roleId,
          status: status ?? true,
          refreshToken: refreshToken ?? null,
        },
        select: userSelect,
      });
      return toSafe(created);
    } catch (e: any) {
      if (e?.code === 'P2002' && Array.isArray(e?.meta?.target) && e.meta.target.includes('email')) {
        throw new AppError(409, 'El email ya está registrado');
      }
      throw e;
    }
  },

  update: async (id: number, data: UserUpdateDTO): Promise<UserSafeDTO> => {
    const payload: Prisma.UserUpdateInput = { ...data };
    if (data.password) payload.password = await bcrypt.hash(data.password, 10);

    const updated = await prisma.user.update({ where: { id }, data: payload, select: userSelect });
    return toSafe(updated);
  },

  remove: async (id: number): Promise<UserSafeDTO> => {
    const updated = await prisma.user.update({
      where: { id },
      data: { status: false },
      select: userSelect,
    });
    return toSafe(updated);
  },

  verifyPassword: async (id: number, password: string): Promise<boolean> => {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, password: true },
    });
    if (!user || !user.password) return false;
    return bcrypt.compare(password, user.password);
  },

  changePassword: async (id: number, newPassword: string): Promise<UserSafeDTO> => {
    const hash = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.user.update({
      where: { id },
      data: { password: hash },
      select: userSelect,
    });
    return toSafe(updated);
  },

  updateRole: async (id: number, roleId: number): Promise<UserSafeDTO> => {
    const updated = await prisma.user.update({ where: { id }, data: { roleId }, select: userSelect });
    return toSafe(updated);
  },

  linkProfile: async (userId: number, profileId: number): Promise<UserWithProfileDTO> => {
    // Ajusta el nombre del modelo si NO es 'profileUser' en tu schema
    const updatedProfile = await prisma.profileUser.update({
      where: { id: profileId },
      data: { userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        user: { select: userSelect },
      },
    });

    if (!updatedProfile.user) {
      throw new Error("Inconsistencia: el perfil no quedó asociado a un usuario");
    }

    return {
      ...toSafe(updatedProfile.user),
      profile: {
        id: updatedProfile.id,
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        email: updatedProfile.email,
        ...(updatedProfile.phone ? { phone: updatedProfile.phone } : {}),
        status: updatedProfile.status,
      },
    };
  },

  unlinkProfile: async (userId: number): Promise<UserWithProfileDTO> => {
    const profile = await prisma.profileUser.findFirst({ where: { userId }, select: { id: true } });
    const u = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!u) throw new Error("User no encontrado");

    if (!profile) {
      return { ...toSafe(u), profile: null };
    }

    await prisma.profileUser.update({ where: { id: profile.id }, data: { userId: 0 } }); // ← null, no 0
    return { ...toSafe(u), profile: null };
  },

  updateStatus: async (id: number, status: boolean) => {
    try {
      const updated = await prisma.user.update({
        where: { id },
        data: { status },
        select: userSelect,
      });
      return toSafe(updated);
    } catch {
      // si no existe, Prisma lanza error => puedes convertir en null
      return null;
    }
  },

  /** Cambia estado en lote; devuelve conteo */
  bulkUpdateStatus: async (ids: number[], status: boolean) => {
    const result = await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    return result; // { count: number }
  },
};
