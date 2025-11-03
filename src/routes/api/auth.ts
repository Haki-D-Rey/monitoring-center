// ==============================================
// src/routes/api/auth.ts
// ==============================================
import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  verifyCode,
  resetPassword,
  tokenInfo,
  testMail,
} from "@controllers/auth";
import { authMiddleware } from "@middlewares/auth";
// import rateLimit from 'express-rate-limit';

// /** Rate limit básico para endpoints públicos de reset */
// const limiter = rateLimit({
//   windowMs: 10 * 60 * 1000, // 10 min
//   max: 30,                  // 30 req por IP en ventana
//   standardHeaders: true,
//   legacyHeaders: false,
// });


const router = Router();

/**
 * POST /api/v1/auth/register (pública)
 */
router.post(
  "/register",
  register
);

/**
 * POST /api/v1/auth/login (pública)
 */
router.post(
  "/login",
  login
);

/**
 * POST /api/v1/auth/refresh-token (pública o según tu flujo)
 */
router.post(
  "/refresh-token",
  refreshToken
);

/**
 * POST /api/v1/auth/logout (requiere bearer)
 */
router.post(
  "/logout",
  authMiddleware,
  logout
);

/**
 * POST /api/v1/auth/forgot-password (pública)
 */
router.post(
  "/forgot-password",
  // limiter,
  forgotPassword
);

/**
 * POST /api/v1/auth/verify-code (pública)
 */
router.post(
  "/verify-code",
  // limiter,
  verifyCode
);


/**
 * POST /api/v1/auth/reset-password (pública)
 */
router.post(
  "/reset-password",
  // limiter,
  resetPassword
);


/**
 * GET /api/v1/auth/token (requiere bearer)
 */
router.get(
  "/token",
  authMiddleware,
  tokenInfo
);

router.get("/email/test", testMail);

export default router;
