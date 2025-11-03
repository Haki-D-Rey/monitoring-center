/* eslint-disable @typescript-eslint/no-explicit-any */
// ==============================================
// src/middlewares/audit.ts
// ==============================================
import type { Request, Response, NextFunction } from "express";
import prisma from "@app-utils/prisma";
import { auditService } from "@services/auditService";
import dns from "dns";

// Mapea el nombre lógico del módulo al delegate de Prisma
// Ajusta/añade los que tengas en tu schema.prisma
const MODULE_TO_MODEL: Record<string, keyof typeof prisma | undefined> = {
  // Admin
  User: "user",
  Role: "role",
  Permission: "permission",

  // No admin
  ProfileUser: "profileUser",
  // Building: "building",
  // BuildingAdmin: "buildingAdmin",
  // Form: "form",
  // FormTemplate: "formTemplate",
  // ... agrega más si hace falta
};

export const auditMiddleware =
  (moduleName: string, action: string) =>
    async (req: Request, res: Response, next: NextFunction) => {
      // 1) Prepara snapshots y captura de salida
      const entityId = Number(req.params?.id) || 0;
      const modelKey = MODULE_TO_MODEL[moduleName]; // delegate p.ej. "user"
      let dataBefore: unknown = undefined;
      let responseBody: unknown = undefined;

      // 2) Si hay id y delegate disponible, buscamos el BEFORE
      if (entityId && modelKey && (prisma as any)[modelKey]?.findUnique) {
        try {
          dataBefore = await (prisma as any)[modelKey].findUnique({
            where: { id: entityId },
          });
        } catch (e) {
          // No rompas el flujo por errores de auditoría

          console.warn(`[AUDIT] No se pudo obtener dataBefore para ${moduleName}#${entityId}:`, e);
        }
      }

      // 3) Intercepta la respuesta para capturar dataAfter
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      (res as any).json = (body: any) => {
        responseBody = body;
        return originalJson(body);
      };

      (res as any).send = (body: any) => {
        // intenta parsear si viene string/Buffer JSON
        try {
          if (typeof body === "string") {
            responseBody = JSON.parse(body);
          } else if (Buffer.isBuffer(body)) {
            const s = body.toString("utf8");
            responseBody = JSON.parse(s);
          } else {
            responseBody = body;
          }
        } catch {
          responseBody = body;
        }
        return originalSend(body);
      };

      // 4) Al terminar la respuesta, persistimos el audit log
      res.on("finish", async () => {
        try {
          // IP real (tras proxies)
          const clientIp =
            (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
            req.socket.remoteAddress?.replace("::ffff:", "") ||
            "0.0.0.0";

          // Resolver hostname
          dns.reverse(clientIp, async (err, hostnames) => {
            const clientHost =
              !err && hostnames && hostnames.length > 0 ? hostnames[0] : "unknown-host";
            const ipWithHost = `${clientIp}-${clientHost}`;
            const payloadAfter = responseBody ?? req.body;

            await auditService.log({
              module: moduleName,
              action,
              ...(req.user?.id !== undefined ? { userId: req.user.id } : {}),
              ...(entityId ? { entityId } : {}),
              ...(entityId && dataBefore !== undefined ? { dataBefore } : {}),
              dataAfter: payloadAfter,
              ipAddress: ipWithHost,
              ...(req.headers["user-agent"] ? { userAgent: req.headers["user-agent"] as string } : {}),
            });
          });
        } catch (e) {

          console.error("[AUDIT] Error guardando log:", e);
        }
      });

      next();
    };
