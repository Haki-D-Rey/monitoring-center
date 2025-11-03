import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '@app-utils/jwt'

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' })
    }

    const token = header.split(' ')[1]
    const payload = verifyAccessToken(token ?? "")
    req.user = payload
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado - ' + error })
  }
}
