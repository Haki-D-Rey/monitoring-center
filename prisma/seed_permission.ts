// ==============================================
// prisma/seed_permission.ts
// ==============================================
import prisma from "../src/utils/prisma";

const CRUD_VERBS = ["create", "edit", "read", "delete", "navbar"] as const;

const MODULES = [
    "building",
    "building_admin",
    "forms",
    "form_template",
    "permission",
    "profile_user",
    "role",
    "user",
] as const;

// Módulos que deben ir con el prefijo "admin"
const ADMINIZED = new Set<string>(["user", "role", "permission"]);

/** Permisos globales */
const GLOBAL_PERMISSIONS = ["full_permissions"] as const;

function buildCrudPermissions() {
    const out: string[] = [];
    for (const mod of MODULES) {
        for (const verb of CRUD_VERBS) {
            // user/role/permission -> verb_admin_<module>
            const name = ADMINIZED.has(mod)
                ? `${verb}_admin_${mod}`
                : `${verb}_${mod}`;
            out.push(name);
        }
    }
    return out;
}

async function truncatePermissions() {
    console.log("🧹 Limpiando tablas de permisos...");

    // 1) Eliminar relaciones por FK primero
    await prisma.roleHasPermission.deleteMany({});
    // 2) Eliminar permissions
    await prisma.permission.deleteMany({});

    // 3) (Opcional) resetear autoincrement/sequence por motor
    const provider = process.env.DATABASE_PROVIDER || process.env.PRISMA_DB_PROVIDER;

    try {
        if ((provider || "").toLowerCase().includes("postgres")) {
            // Alternativa: TRUNCATE ... RESTART IDENTITY CASCADE
            // await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Permission" RESTART IDENTITY CASCADE;`);
            await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Permission_id_seq" RESTART WITH 1;`);
        } else if ((provider || "").toLowerCase().includes("mysql")) {
            await prisma.$executeRawUnsafe(`ALTER TABLE Permission AUTO_INCREMENT = 1;`);
        } else if ((provider || "").includes("sqlite")) {
            await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name = 'Permission';`);
        }
        console.log("🔄 Secuencias/autoincrement reseteados (opcional).");
    } catch (e) {
        console.warn("⚠️ No se pudo resetear el autoincrement/sequence:", (e as Error).message);
    }

    console.log("✅ Limpieza completada.");
}

async function main() {
    console.log("🌱 Iniciando seeding de permisos...");

    // --- TRUNCATE / CLEAN FIRST ---
    await truncatePermissions();

    const crudPermissions = buildCrudPermissions();
    const all = [...GLOBAL_PERMISSIONS, ...crudPermissions];

    // upsert en paralelo por lotes
    const chunkSize = 50;
    for (let i = 0; i < all.length; i += chunkSize) {
        const slice = all.slice(i, i + chunkSize);
        await Promise.all(
            slice.map((name) =>
                prisma.permission.upsert({
                    where: { name },
                    update: {},
                    create: { name, status: true },
                })
            )
        );
        console.log(`✅ Permisos creados/asegurados (${i + slice.length}/${all.length})`);
    }

    console.log("🔢 Total módulos:", MODULES.length);
    console.log("🧩 CRUD por módulo:", CRUD_VERBS.join(", "));
    console.log('🛠️  Módulos con "admin":', [...ADMINIZED].join(", "));
    console.log("🗂️  Permisos globales:", GLOBAL_PERMISSIONS.join(", "));
    console.log("✅ Seeding de permisos completado.");
}

main()
    .catch((e) => {
        console.error("❌ Error durante el seeding de permisos:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
