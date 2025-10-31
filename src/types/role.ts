// ==============================================
// src/types/role.ts
// ==============================================

export type RoleSafeDTO = {
    id: number;
    name: string;
    status: boolean;
    createdAt: Date;
    updatedAt?: Date; // null -> undefined en el mapeo
    permissions?: PermissionSafeDTO[]
};

export type RoleCreateDTO = {
    name: string;
    status?: boolean;
};

export type RoleUpdateDTO = Partial<{
    name: string;
    status: boolean;
    permissions: PermissionSafeDTO[]
}>;

export type RoleFilters = {
    // búsqueda libre
    q?: string;
    search?: string;

    // campo propio de Roles
    name?: string;

    // filtros directos
    status?: boolean | 'true' | 'false';

    // rango de fechas (createdAt)
    createdAt?: { from?: string; to?: string };

    // orden
    sortBy?: 'id' | 'name' | 'status' | 'createdAt' | 'updatedAt' | string;
    sortDir?: 'asc' | 'desc' | string;
};

export type RoleQuery = {
    page?: number;
    pageSize?: number;
    perPage?: number;
    sortBy?: 'id' | 'name' | 'status' | 'createdAt' | 'updatedAt';
    sortDir?: 'asc' | 'desc';
    q?: string;
    search?: string;
    filters?: RoleFilters;
};

// Permisos (mínimo necesario para asignación)
export type PermissionSafeDTO = {
    id: number;
    name: string;
    status: boolean;
    createdAt: Date;
    updatedAt?: Date;
};

export type RoleHasPermissionDTO = {
    id: number;
    roleId: number;
    permissionId: number;
    status: boolean;
    createdAt: Date;
    updatedAt?: Date;
};


// Ejemplo: el “row” de la tabla
export type RolePage = RoleSafeDTO;
