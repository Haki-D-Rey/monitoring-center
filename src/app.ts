/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { loadRoutes } from "@app-utils/load-routes";
import { configDotenv } from "dotenv";
import { formatDatesToTZ } from "@middlewares/format-date";

configDotenv({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env.development",
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", true);
app.use(formatDatesToTZ("America/Guatemala"));
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR]', err);
  if (res.headersSent) return next(err);
  res.status(err?.status || 500).json({ error: err?.message || 'Internal Server Error' });
});


// // ---------------- Swagger solo en desarrollo ----------------
// if (process.env.NODE_ENV === "development") {
//   (async () => {
//     try {
//       const [swaggerUiModule, swaggerJsdocModule, openapiModule] = await Promise.all([
//         import("swagger-ui-express"),
//         import("swagger-jsdoc"),
//         import("./docs/open-api"), // exporta: export const openapiOptions = {...}
//       ]);

//       const swaggerUi = swaggerUiModule.default;         // función middleware
//       const swaggerJSDoc = swaggerJsdocModule.default;   // función (options) => spec
//       const { openapiOptions } = openapiModule;          // objeto de opciones

//       const spec = swaggerJSDoc(openapiOptions);

//       // UI
//       app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));

//       // (Opcional) JSON crudo del spec
//       app.get("/docs.json", (_req, res) => {
//         res.setHeader("Content-Type", "application/json");
//         res.send(spec);
//       });

//       console.log("📚 Swagger UI disponible en /docs (solo desarrollo)");
//     } catch (err) {
//       console.error("❌ Error cargando Swagger UI/Spec:", err);
//     }
//   })();
// }
// ------------------------------------------------------------

// --- Definir grupos de rutas ---
loadRoutes(app, [
  // { prefix: '/api/v1', folder: './src/routes/api/auth' },  -- ejemplo: carpeta completa
  { prefix: "/api/v1/auth", folder: "./src/routes/api/auth.ts" },
  { prefix: "/api/v1/admin/role", folder: "./src/routes/api/role.ts" },
  { prefix: "/api/v1/admin/permission", folder: "./src/routes/api/permission.ts" },
  { prefix: "/api/v1/admin/user", folder: "./src/routes/api/user.ts" },
  //   { prefix: "/api/v1/forms", folder: "./src/routes/api/forms.ts" },
]);

app.get("/api/v1", (_req, res) => {
  res.json({ message: "¡Hola mundo desde la raíz del API!" });
});


export default app;
