
// ==============================================
// prisma/seed_role_permissions.ts
// ==============================================
import prisma from "../src/utils/prisma";

// === Verbos disponibles (incluye navbar como parte del CRUD “extendido”) ===
const VERBS_CRUD = ["create", "edit", "read", "delete", "navbar"] as const;
const VERBS_READONLY = ["navbar", "read"] as const;

// === Módulos (coinciden con los usados en seed_permission.ts) ===
const MODULES = [
    "permission",
    "profile_user",
    "role",
    "user",
] as const;

// === Con “admin” en el nombre de los permisos ===
const ADMINIZED = new Set<string>(["user", "role", "permission"]);

// === Roles por nombre (exactamente como están en tu BD) ===
const ROLE_NAMES = {
    userManagment: "UserManagment",
    superAdmin: "SuperAdmin",
    userStandard: "UserStandard",
} as const;

// === Permiso global ===
const GLOBAL_PERMISSION = "full_permissions";

/** Retorna los permisos `verb[_admin]_module` para los módulos NO admin */
function buildNonAdminPermissions(verbs: readonly string[]) {
    const names: string[] = [];
    for (const mod of MODULES) {
        if (ADMINIZED.has(mod)) continue; // excluir admin modules
        for (const v of verbs) {
            names.push(`${v}_${mod}`);
        }
    }
    return names;
}

async function main() {
    console.log("🌱 Asignando permisos a roles...");

    // 1) Cargar roles
    const roles = await prisma.role.findMany({
        where: { name: { in: Object.values(ROLE_NAMES) } },
        select: { id: true, name: true },
    });
    console.log(roles);

    const roleByName = new Map(roles.map(r => [r.name, r]));
    const superAdmin = roleByName.get(ROLE_NAMES.superAdmin);
    const userManagment = roleByName.get(ROLE_NAMES.userManagment);
    const userStandard = roleByName.get(ROLE_NAMES.userStandard);

    if (!superAdmin || !userManagment || !userStandard) {
        throw new Error("No se encontraron todos los roles requeridos: SuperAdmin, UserManagment, UserStandard");
    }

    // 2) Construir NOMBRES de permisos requeridos por cada rol
    const permsForUserManagment = buildNonAdminPermissions(VERBS_CRUD);
    const permsForUserStandard = [
        ...buildNonAdminPermissions(VERBS_READONLY),
        "edit_profile_user", // extra: solo puede editar en profile_user
    ];

    // SuperAdmin solo requiere el global
    const permsForSuperAdmin = [GLOBAL_PERMISSION];

    // 3) Buscar IDs de esos permisos
    const requiredNames = Array.from(
        new Set([...permsForUserManagment, ...permsForUserStandard, ...permsForSuperAdmin])
    );

    const foundPerms = await prisma.permission.findMany({
        where: { name: { in: requiredNames } },
        select: { id: true, name: true },
    });
    const permByName = new Map(foundPerms.map(p => [p.name, p]));

    // Verificar faltantes
    const missing = requiredNames.filter(n => !permByName.has(n));
    if (missing.length) {
        throw new Error(
            `Faltan permisos en BD, ejecuta primero el seed de permisos. Missing: ${missing.join(", ")}`
        );
    }

    // 4) (Opcional) Limpiar relaciones previas de estos 3 roles para evitar duplicados
    await prisma.roleHasPermission.deleteMany({
        where: { roleId: { in: [superAdmin.id, userManagment.id, userStandard.id] } },
    });

    // 5) Insertar relaciones (upsert por si cambias eliminación en el futuro)
    const relationsToCreate: Array<{ roleId: number; permissionId: number }> = [];

    // SuperAdmin -> full_permissions
    for (const name of permsForSuperAdmin) {
        relationsToCreate.push({ roleId: superAdmin.id, permissionId: permByName.get(name)!.id });
    }

    // UserManagment -> CRUD en NO admin
    for (const name of permsForUserManagment) {
        relationsToCreate.push({ roleId: userManagment.id, permissionId: permByName.get(name)!.id });
    }

    // UserStandard -> navbar+read en NO admin + edit_profile_user
    for (const name of permsForUserStandard) {
        relationsToCreate.push({ roleId: userStandard.id, permissionId: permByName.get(name)!.id });
    }

    // Batch insert (upsert)
    const chunk = 100;
    for (let i = 0; i < relationsToCreate.length; i += chunk) {
        const slice = relationsToCreate.slice(i, i + chunk);
        await Promise.all(
            slice.map(({ roleId, permissionId }) =>
                prisma.roleHasPermission.upsert({
                    where: { roleId_permissionId: { roleId, permissionId } },
                    update: {},
                    create: { roleId, permissionId, status: true },
                })
            )
        );
        console.log(`🔗 Asignadas ${Math.min(i + chunk, relationsToCreate.length)}/${relationsToCreate.length}`);
    }

    console.log("✅ Asignación de permisos a roles completada.");
}

main()
    .catch((e) => {
        console.error("❌ Error en seed de role-permissions:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
