// ==============================================
// src/routes/api/user.ts
// ==============================================
import { Router } from "express";
import { UserController } from "@controllers/user";
import { validate } from "@middlewares/validate";
import { auditMiddleware } from "@middlewares/audit";
import { checkPermission } from "@middlewares/permissions";
import {
    createUserSchema,
    updateUserSchema,
    removeUserSchema,
    changePasswordSchema,
    updateRoleSchema,
    linkProfileSchema,
    unlinkProfileSchema,
    paginationQuerySchema,
    verifyPasswordSchema,
    updateUserStatusSchema,
    bulkUpdateUserStatusSchema,
} from "@validators/userValidator";
import { authMiddleware } from "@middlewares/auth";

const router = Router();
router.use(authMiddleware);

// Helper para no repetir strings
const P = (verb: "create" | "edit" | "read" | "delete" | "navbar") =>
    `${verb}_admin_user` as const;

// Listado (read)
router.get(
    "/",
    validate(paginationQuerySchema),
    checkPermission(P("read")),
    auditMiddleware("User", "getAll"),
    UserController.getAll
);

// Obtener por ID (read)
router.get(
    "/:id",
    checkPermission(P("read")),
    auditMiddleware("User", "getById"),
    UserController.getById
);

// Crear (create)
router.post(
    "/",
    validate(createUserSchema),
    checkPermission(P("create")),
    auditMiddleware("User", "create"),
    UserController.create
);

// Actualizar (edit)
router.put(
    "/:id",
    validate(updateUserSchema),
    checkPermission(P("edit")),
    auditMiddleware("User", "update"),
    UserController.update
);

// Eliminar (delete)
router.delete(
    "/:id",
    validate(removeUserSchema),
    checkPermission(P("delete")),
    auditMiddleware("User", "remove"),
    UserController.remove
);

// ----- extras comunes de administración -----

// ✅ nuevo: verificar contraseña del usuario autenticado
router.post(
    '/verify-password',
    validate(verifyPasswordSchema),
    checkPermission(P('edit')), // opcional: puedes exigir solo "auth" si prefieres
    auditMiddleware('User', 'verifyPassword'),
    UserController.verifyPassword
);

// Cambiar password (edit)
router.put(
    "/:id/password",
    validate(changePasswordSchema),
    checkPermission(P("edit")),
    auditMiddleware("User", "changePassword"),
    UserController.changePassword
);

// Cambiar rol (edit)
router.post(
    "/:id/role",
    validate(updateRoleSchema),
    checkPermission(P("edit")),
    auditMiddleware("User", "updateRole"),
    UserController.updateRole
);

// ----- relación 1:1 con ProfileUser -----
// Ver perfil (read)
router.get(
    "/:id/profile",
    checkPermission(P("read")),
    auditMiddleware("User", "getProfile"),
    UserController.getProfile
);

// Vincular perfil (edit)
router.post(
    "/:id/profile",
    validate(linkProfileSchema),
    checkPermission(P("edit")),
    auditMiddleware("User", "linkProfile"),
    UserController.linkProfile
);

// Desvincular perfil (edit)
router.delete(
    "/:id/profile",
    validate(unlinkProfileSchema),
    checkPermission(P("edit")),
    auditMiddleware("User", "unlinkProfile"),
    UserController.unlinkProfile
);


/** Actualizar estado individual */
router.patch(
    "/:id",
    validate(updateUserStatusSchema),
    checkPermission(P("edit")),
    auditMiddleware("User", "updateStatus"),
    UserController.updateStatus
);

/** Actualizar estado en lote */
router.post(
    "/bulk-status",
    validate(bulkUpdateUserStatusSchema),
    checkPermission(P("edit")),
    auditMiddleware("User", "bulkUpdateStatus"),
    UserController.bulkUpdateStatus
);

export default router;
