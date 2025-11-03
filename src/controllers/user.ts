// ==============================================
// src/controllers/user.ts
// ==============================================
import type { Request, Response } from "express";
import { userService } from "@services/userService";
import type { UserPage, UserQuery, UserWithProfileDTO } from "@app-types/user";
import { PaginatedController, sendById, FiltersOf } from "./_base/paginatedController";
import { ListParams, PageFetchResult } from "@src/types/pagination";

class UserControllerImpl extends PaginatedController<UserQuery, UserPage> {
  protected async fetchPage(
    params: ListParams<FiltersOf<UserQuery>>
  ): Promise<PageFetchResult<UserPage>> {
    const { page, pageSize, sortBy, sortDir, search, filters } = params;

    const filterArgs = {
      ...filters,
      ...(search ? { search } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortDir ? { sortDir } : {}),
    } as const;

    const result = await userService.getAll(page, pageSize, filterArgs);
    return result;
  }


  /** GET /:id */
  public getById = (req: Request, res: Response) =>
    sendById<UserWithProfileDTO>(req, res, userService.getById, "User not found");

  /** POST / */
  public create = async (req: Request, res: Response) => {
    const user = await userService.create(req.body);
    res.status(201).json(user);
  };

  /** PUT /:id */
  public update = async (req: Request, res: Response) => {
    const user = await userService.update(Number(req.params.id), req.body);
    res.json(user);
  };

  /** DELETE /:id  (soft delete) */
  public remove = async (req: Request, res: Response) => {
    const user = await userService.remove(Number(req.params.id));
    res.json(user);
  };

  /** ✅ POST /verify-password — verifica la contraseña del usuario autenticado */
  public verifyPassword = async (req: Request, res: Response) => {
    const authUserId = req.user?.id;
    if (!authUserId) throw res.status(401).json({ error: 'No autenticado' });

    const ok = await userService.verifyPassword(authUserId, req.body.password);
    if (!ok) throw res.status(401).json({ error: 'Contraseña inválida' });

    // 204 No Content para no exponer nada sensible
    res.status(204).send();
  };

  /** POST /:id/password */
  public changePassword = async (req: Request, res: Response) => {
    const user = await userService.changePassword(Number(req.params.id), req.body.password);
    res.json(user);
  };

  /** POST /:id/role */
  public updateRole = async (req: Request, res: Response) => {
    const user = await userService.updateRole(Number(req.params.id), req.body.roleId);
    res.json(user);
  };

  /** GET /:id/profile */
  public getProfile = async (req: Request, res: Response) => {
    const user = await userService.getById(Number(req.params.id));
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.profile ?? null);
  };

  /** POST /:id/profile */
  public linkProfile = async (req: Request, res: Response) => {
    const result = await userService.linkProfile(Number(req.params.id), req.body.profileId);
    res.json(result);
  };

  /** DELETE /:id/profile */
  public unlinkProfile = async (req: Request, res: Response) => {
    const result = await userService.unlinkProfile(Number(req.params.id));
    res.json(result);
  };

  public updateStatus = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { status } = req.body as { status: boolean };

    const updated = await userService.updateStatus(id, status);
    if (!updated) return res.status(404).json({ error: "Usuario no encontrado" });
    return res.json(updated);
  };

  /** POST /bulk-status  { ids: number[], status: boolean } */
  public bulkUpdateStatus = async (req: Request, res: Response) => {
    const { ids, status } = req.body as { ids: number[]; status: boolean };

    const result = await userService.bulkUpdateStatus(ids, status);
    // Puedes devolver sólo el conteo o, si prefieres, los usuarios afectados.
    return res.json({ updated: result.count });
  };
}

export const UserController = new UserControllerImpl();


/** Request tipado para el listado (evitar any) */
// type ListUsersReq = Request & { validated: { query: UserQuery } };
// export const getAllTyped = (req: ListUsersReq, res: Response) => UserController.getAll(req, res);
