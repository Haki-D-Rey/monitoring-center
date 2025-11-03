import { Request, Response, NextFunction } from 'express'
import prisma from '@app-utils/prisma'

export const checkPermission = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        }
      }
    })

    const hasPermission = user?.role.permissions.some(
      (rp) => rp.permission.name === permissionName || rp.permission.name === 'full_permissions'
    )

    if (!hasPermission) return res.status(403).json({ http_code: 403, status: 'Forbbiden', error: 'Acceso denegado', missing: `Se necesita asignarle al usuario ${user?.email} el permiso ${permissionName} para poder usar este Servicio API` })
    next()
  }
}
