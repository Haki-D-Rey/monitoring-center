/* eslint-disable @typescript-eslint/no-explicit-any */
// ==============================================
// src/controllers/role.ts
// ==============================================
import type { Request, Response } from "express";
import { roleService } from "@services/roleService";
import { FiltersOf, PaginatedController, sendById } from "./_base/paginatedController";
import type {
  RolePage,
  RoleQuery,
  RoleSafeDTO,
  RoleCreateDTO,
  RoleUpdateDTO,
  RoleHasPermissionDTO,
} from "@src/types/role";
import { ListParams, PageFetchResult } from "@src/types/pagination";

class RoleControllerImpl extends PaginatedController<RoleQuery, RolePage> {
  /** GET / (paginado) */
  protected async fetchPage(
    params: ListParams<FiltersOf<RoleQuery>>
  ): Promise<PageFetchResult<RolePage>> {
    const { page, pageSize, sortBy, sortDir, search, filters } = params;

    const filterArgs = {
      ...filters,
      ...(search ? { search } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortDir ? { sortDir } : {}),
    } as const;

    const result = await roleService.getAll(page, pageSize, filterArgs);

    return result;
  }


  /** GET /:id */
  public getById = (req: Request, res: Response<RoleSafeDTO | { error: string }>) =>
    sendById<RoleSafeDTO>(req, res, roleService.getById, "Role not found");

  /** POST / */
  public create = async (
    req: Request<any, any, RoleCreateDTO>,
    res: Response<RoleSafeDTO>
  ) => {
    const role = await roleService.create(req.body);
    res.status(201).json(role);
  };

  /** PUT /:id */
  public update = async (
    req: Request<{ id: string }, any, RoleUpdateDTO>,
    res: Response<RoleSafeDTO>
  ) => {
    const role = await roleService.update(Number(req.params.id), req.body);
    res.json(role);
  };

  /** DELETE /:id */
  public remove = async (
    req: Request<{ id: string }>,
    res: Response<void>
  ) => {
    await roleService.remove(Number(req.params.id));
    res.status(204).send();
  };

  /** POST /assign-permission */
  public assignPermission = async (
    req: Request<any, any, { roleId: number; permissionId: number }>,
    res: Response<RoleHasPermissionDTO>
  ) => {
    const { roleId, permissionId } = req.body;
    const relation = await roleService.assignPermission(roleId, permissionId);
    res.status(201).json(relation);
  };

  /** POST /remove-permission */
  public removePermission = async (
    req: Request<any, any, { roleId: number; permissionId: number }>,
    res: Response<void>
  ) => {
    const { roleId, permissionId } = req.body;
    await roleService.removePermission(roleId, permissionId);
    res.status(204).send();
  };

  public updateStatus = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { status } = req.body as { status: boolean };

    const updated = await roleService.updateStatus(id, status);
    if (!updated) return res.status(404).json({ error: "Usuario no encontrado" });
    return res.json(updated);
  };

  /** POST /bulk-status  { ids: number[], status: boolean } */
  public bulkUpdateStatus = async (req: Request, res: Response) => {
    const { ids, status } = req.body as { ids: number[]; status: boolean };

    const result = await roleService.bulkUpdateStatus(ids, status);
    // Puedes devolver sólo el conteo o, si prefieres, los usuarios afectados.
    return res.json({ updated: result.count });
  };
}

export const RoleController = new RoleControllerImpl();
