// src/utils/prisma.ts
import { PrismaClient } from "@prisma/client";
export type { Prisma } from "@prisma/client";     // 👈 re-export de tipos

const base = new PrismaClient();

const prisma = base.$extends({
    query: {
        $allModels: {
            // se dispara antes de cada operación de cualquier modelo
            async $allOperations({ args, query }) {
                // fija TZ en la sesión de la conexión tomada del pool
                await base.$executeRawUnsafe(`SET TIME ZONE 'America/Guatemala'`);
                return query(args);
            },
        },
    },
});

export default prisma;