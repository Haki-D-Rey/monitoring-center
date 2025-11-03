/* eslint-disable @typescript-eslint/no-explicit-any */
// ==============================================
// src/controllers/permission.ts
// ==============================================
import type { NextFunction, Request, Response } from "express";
import { permissionService } from "@services/permissionService";
import { FiltersOf, PaginatedController, sendById } from "@controllers/_base/paginatedController";
import type {
  PermissionPage,
  PermissionQuery,
  PermissionSafeDTO,
  PermissionCreateDTO,
  PermissionUpdateDTO,
} from "@src/types/permission";
import { ListParams, PageFetchResult } from "@src/types/pagination";

class PermissionControllerImpl extends PaginatedController<PermissionQuery, PermissionPage> {
  /** GET / (paginado) */
  protected async fetchPage(
    params: ListParams<FiltersOf<PermissionQuery>>
  ): Promise<PageFetchResult<PermissionPage>> {
    const { page, pageSize, sortBy, sortDir, search, filters } = params;

    const filterArgs = {
      ...filters,
      ...(search ? { search } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortDir ? { sortDir } : {}),
    } as const;

    const result = await permissionService.getAll(page, pageSize, filterArgs);

    return result;
  }

  /** GET /:id */
  public getById = (req: Request, res: Response<PermissionSafeDTO | { error: string }>) =>
    sendById<PermissionSafeDTO>(req, res, permissionService.getById, "Permission not found");


  public getAllList = async (
    _req: Request,
    res: Response<PermissionSafeDTO[]>,
    next: NextFunction
  ) => {
    try {
      const resultado = await permissionService.getAll();
      return res.status(200).json(resultado.data);
    } catch (err) {
      return next(err);
    }
  };


  /** POST / */
  public create = async (
    req: Request<any, any, PermissionCreateDTO>,
    res: Response<PermissionSafeDTO>
  ) => {
    const permission = await permissionService.create(req.body);
    res.status(201).json(permission);
  };

  /** PUT /:id */
  public update = async (
    req: Request<{ id: string }, any, PermissionUpdateDTO>,
    res: Response<PermissionSafeDTO>
  ) => {
    const permission = await permissionService.update(Number(req.params.id), req.body);
    res.json(permission);
  };

  /** DELETE /:id */
  public remove = async (req: Request<{ id: string }>, res: Response<void>) => {
    await permissionService.remove(Number(req.params.id));
    res.status(204).send();
  };
}

export const PermissionController = new PermissionControllerImpl();