// ==============================================
// src/types/permission.ts
// ==============================================
import { RoleFilters, RoleSafeDTO } from "./role";

export type PermissionSafeDTO = {
  id: number;
  name: string;
  status: boolean;
  createdAt: Date;
  updatedAt?: Date; // null -> undefined
};

export type PermissionCreateDTO = {
  name: string;
  status?: boolean;
};

export type PermissionUpdateDTO = Partial<{
  name: string;
  status: boolean;
}>;

export type PermissionQuery = {
  page: number;
  pageSize: number;
  q?: string;
  status?: boolean;
};
export type PermissionFilters = RoleFilters;
export type PermissionPage = RoleSafeDTO;
