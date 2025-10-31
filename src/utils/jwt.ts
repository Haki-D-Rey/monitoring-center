/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from 'jsonwebtoken'
import { AuthTokenPayload } from '@app-types/auth'
import moment from 'moment-timezone'

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_key'

/**
 * Genera un access token de corta duración (ej. 15 min)
 */
export const generateAccessToken = (payload: AuthTokenPayload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
}

/**
 * Genera un refresh token de larga duración (ej. 7 días)
 */
export const generateRefreshToken = (payload: AuthTokenPayload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

/**
 * Valida y decodifica un access token
 */
export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload
}

/**
 * Valida y decodifica un refresh token
 */
export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as AuthTokenPayload
}

/**
 * Extrae información del token (payload + expiración)
 */
export const getTokenInfo = (token: string, type: 'access' | 'refresh' = 'access') => {
  try {
    const decoded = jwt.decode(token) as { [key: string]: any } | null
    if (!decoded) return null

    return {
      payload: decoded,
      tokenType: type,
      expiresAt: decoded.exp
        ? moment.unix(decoded.exp)
            .tz('America/Guatemala')
            .format('YYYY-MM-DD HH:mm:ss')
        : null
    }
  } catch {
    return null
  }
}