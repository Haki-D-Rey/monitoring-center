// ==============================================
// src/routes/api/role.ts
// ==============================================
import { Router } from "express";
import { RoleController } from "@controllers/role";
import { validate } from "@middlewares/validate";
import { auditMiddleware } from "@middlewares/audit";
import { authMiddleware } from "@middlewares/auth";
import { checkPermission } from "@middlewares/permissions";
import {
  createRoleSchema,
  updateRoleSchema,
  removeRoleSchema,
  assignPermissionSchema,
  removePermissionSchema,
  roleQuerySchema,
  bulkUpdateRoleStatusSchema,
  updateRoleStatusSchema,
} from "@validators/roleValidator";

const router = Router();

// 🔐 Todas las rutas requieren token
router.use(authMiddleware);

// helper para no repetir strings
const P = (verb: "create" | "edit" | "read" | "delete" | "navbar") =>
  `${verb}_admin_role` as const;

// ============ RUTAS ============

// Listado (read)
router.get(
  "/",
  checkPermission(P("read")),
  validate(roleQuerySchema),
  auditMiddleware("Role", "getAll"),
  RoleController.getAll
);

// Obtener por ID (read)
router.get(
  "/:id",
  checkPermission(P("read")),
  auditMiddleware("Role", "getById"),
  RoleController.getById
);

// Crear (create)
router.post(
  "/",
  checkPermission(P("create")),
  validate(createRoleSchema),
  auditMiddleware("Role", "create"),
  RoleController.create
);

// Actualizar (edit)
router.put(
  "/:id",
  checkPermission(P("edit")),
  validate(updateRoleSchema),
  auditMiddleware("Role", "update"),
  RoleController.update
);

// Eliminar (delete)
router.delete(
  "/:id",
  checkPermission(P("delete")),
  validate(removeRoleSchema),
  auditMiddleware("Role", "remove"),
  RoleController.remove
);

// Asignar permiso a rol (edit)
router.post(
  "/assign-permission",
  checkPermission(P("edit")),
  validate(assignPermissionSchema),
  auditMiddleware("Role", "assignPermission"),
  RoleController.assignPermission
);

// Remover permiso de rol (edit)
router.post(
  "/remove-permission",
  checkPermission(P("edit")),
  validate(removePermissionSchema),
  auditMiddleware("Role", "removePermission"),
  RoleController.removePermission
);

/** Actualizar estado individual */
router.patch(
  "/:id",
  validate(updateRoleStatusSchema),
  checkPermission(P("edit")),
  auditMiddleware("Role", "updateStatus"),
  RoleController.updateStatus
);

/** Actualizar estado en lote */
router.post(
  "/bulk-status",
  validate(bulkUpdateRoleStatusSchema),
  checkPermission(P("edit")),
  auditMiddleware("Role", "bulkUpdateStatus"),
  RoleController.bulkUpdateStatus
);

export default router;
