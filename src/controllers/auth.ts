/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import prisma from '@app-utils/prisma'
import {
  generateAccessToken,
  generateRefreshToken,
  getTokenInfo,
  verifyAccessToken,
  verifyRefreshToken
} from '@app-utils/jwt'
import { registerSchema, loginSchema } from '@validators/authValidator'
import { Role } from '@prisma/client'
import { createAndSendResetCode, verifyCodeAndIssueToken, consumeTokenAndResetPassword } from '@services/authService';
import { hashPassword } from '@app-utils/security';
import { sendResetCodeEmail } from '@src/services/mailer/mailer'
import { SendResetResult } from '@src/types/mailer'

/**
 * Registro de usuario
 */
export const register = async (req: Request, res: Response) => {
  try {
    const parsedData = registerSchema.parse(req.body)
    const { email, password, role } = parsedData

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ error: 'El email ya está registrado' })
    }

    // Verificar el roleId
    const roleArray: Role | null = (await prisma.role.findUnique({ where: { name: role, status: true } }));
    if (!roleArray) {
      return res.status(409).json({ error: 'El Rol no Existe' })
    }
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, roleId: roleArray.id }
    });

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: { id: user.id, email: user.email, roleId: user.roleId }
    })


  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message })
    }
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

/**
 * Login y generación de tokens
 */
export const login = async (req: Request, res: Response) => {
  try {
    const parsedData = loginSchema.parse(req.body)
    const { email, password } = parsedData

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ status: false, http_code: 401, error: 'Credenciales inválidas' })

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const accessToken = generateAccessToken({ id: user.id })
    const refreshToken = generateRefreshToken({ id: user.id })

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    // Decodificar el token para extraer info
    const decoded = getTokenInfo(accessToken) as { [key: string]: any }
    const response = {
      data: {
        message: 'Login exitoso',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          roleId: user.roleId
        },
        tokenInfo: {
          payload: decoded, // info contenida en el token
          expiresAt: decoded?.exp ? new Date(decoded.exp * 1000) : null
        }
      },
      status: 200,
      message: "El Usuario se Logueo Exitosamente"
    }
    return res.status(200).json(response)
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message })
    }
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

/**
 * Renovación de Access Token usando Refresh Token
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshToken
    if (!token) return res.status(401).json({ error: 'No hay refresh token' })

    const payload = verifyRefreshToken(token)

    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ error: 'Refresh token inválido' })
    }

    const newAccessToken = generateAccessToken({ id: user.id })
    const decoded = getTokenInfo(newAccessToken) as { [key: string]: any }

    return res.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        roleId: user.roleId
      },
      tokenInfo: {
        payload: decoded,
        expiresAt: decoded?.exp ? new Date(decoded.exp * 1000) : null
      }
    })
  } catch (error) {
    if (error instanceof Error) {
      return res.status(403).json({
        error: 'Refresh token inválido o expirado' + error.message
      })
    }
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

/**
 * Logout
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshToken
    if (token) {
      const payload = verifyRefreshToken(token)
      await prisma.user.update({
        where: { id: payload.id },
        data: { refreshToken: null }
      })
    }

    res.clearCookie('refreshToken')
    return res.json({ message: 'Logout exitoso' })
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: 'Error durante el logout' + error.message })
    }
  }
}

/**
 * Recuperación de contraseña
 */

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  const normalizedEmail = email.toLocaleLowerCase().trim();
  const existingEmail = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (!existingEmail) {
    return res.status(400).json({ message: 'El correo no existe' });
  }

  // Respuesta SIEMPRE 200 para no filtrar existencia
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const ua = req.get('user-agent');

      const args: Parameters<typeof createAndSendResetCode>[0] = {
        email,
        ...(req.ip ? { ip: req.ip } : {}),
        ...(ua ? { userAgent: ua } : {}),
      };

      await createAndSendResetCode(args);
    }

    return res.json({ message: 'Si el correo existe, enviaremos un código de verificación' });
  } catch (e: any) {
    return res.json({ message: 'Si el correo existe, enviaremos un código de verificación - ' + e });
  }

}

export const verifyCode = async (req: Request, res: Response) => {
  const { email, code } = req.body as { email: string; code: string };
  if (!email || !code) return res.status(400).json({ error: 'Email y código son requeridos' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const ua = req.get('user-agent');

      const args: Parameters<typeof verifyCodeAndIssueToken>[0] = {
        email,
        code,
        ...(req.ip ? { ip: req.ip } : {}),
        ...(ua ? { userAgent: ua } : {}),
      };

      const result = await verifyCodeAndIssueToken(args);
      return res.json(result);
    }
  } catch (e: any) {
    return res.status(400).json({ error: e.message || 'No se pudo verificar el código' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, resetToken, newPassword } = req.body as { email: string; resetToken: string; newPassword: string };
  if (!email || !resetToken || !newPassword) {
    return res.status(400).json({ error: 'Parámetros incompletos' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Contraseña demasiado corta' });
  }

  try {
    const newPasswordHash = await hashPassword(newPassword);
    await consumeTokenAndResetPassword({ email, resetToken, newPasswordHash });
    return res.json({ message: 'Contraseña actualizada' });
  } catch (e: any) {
    return res.status(400).json({ error: e.message || 'No se pudo actualizar la contraseña' });
  }
};


/**
 * Obtiene info detallada del token y del usuario asociado
 */
export const tokenInfo = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'No se proporcionó token' })

    const token = authHeader.replace('Bearer ', '')

    // Validar token
    const payload = verifyAccessToken(token)

    // Obtener info extra del token
    const tokenDetails = getTokenInfo(token)

    // Obtener info del usuario
    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    return res.json({
      tokenInfo: tokenDetails,
      user: {
        id: user.id,
        email: user.email,
        roleId: user.roleId
      }
    })
  } catch (error) {
    if (error instanceof Error) {
      return res.status(403).json({ error: 'Token inválido o expirado ' + error.message })
    }
    return res.status(500).json({ error: 'Error durante el evento' })
  }
}

// controller/auth.ts
export const testMail = async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  const response: SendResetResult = await sendResetCodeEmail({ to: email, code: '459887', url: './../../../public/assets/pame-logo-t.png' });
  return res.status(200).json(response);
};

