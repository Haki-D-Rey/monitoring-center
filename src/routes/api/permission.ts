// ==============================================
// src/routes/api/permission.ts
// ==============================================
import { Router } from "express";
import { PermissionController } from "@controllers/permission";
import { validate } from "@middlewares/validate";
import { auditMiddleware } from "@middlewares/audit";
import { authMiddleware } from "@middlewares/auth";
import { checkPermission } from "@middlewares/permissions";
import {
  listPermissionsQuerySchema,
  createPermissionSchema,
  updatePermissionSchema,
  removePermissionSchema,
} from "@validators/permissionValidator";

const router = Router();

// 🔐 Todas requieren token
router.use(authMiddleware);

// helper: permisos admin/permission
const P = (verb: "create" | "edit" | "read" | "delete" | "navbar") =>
  `${verb}_admin_permission` as const;

// Listado Table (read)
router.get(
  "/",
  checkPermission(P("read")),
  validate(listPermissionsQuerySchema),
  auditMiddleware("Permission", "getAll"),
  PermissionController.getAll
);

// Listado total (read)
router.get(
  "/getAll",
  checkPermission(P("read")),
  auditMiddleware("Permission", "getAll"),
  PermissionController.getAllList
);

// By Id (read)
router.get(
  "/:id",
  checkPermission(P("read")),
  auditMiddleware("Permission", "getById"),
  PermissionController.getById
);

// Crear (create)
router.post(
  "/",
  checkPermission(P("create")),
  validate(createPermissionSchema),
  auditMiddleware("Permission", "create"),
  PermissionController.create
);

// Actualizar (edit)
router.put(
  "/:id",
  checkPermission(P("edit")),
  validate(updatePermissionSchema),
  auditMiddleware("Permission", "update"),
  PermissionController.update
);

// Eliminar (delete)
router.delete(
  "/:id",
  checkPermission(P("delete")),
  validate(removePermissionSchema),
  auditMiddleware("Permission", "remove"),
  PermissionController.remove
);

export default router;
