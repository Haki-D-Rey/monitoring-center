/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from '@app-utils/prisma';
import { Prisma } from '@prisma/client';


export const auditService = {
  log: async (params: {
    userId?: number
    module: string
    action: string
    entityId?: number
    dataBefore?: any
    dataAfter?: any
    ipAddress?: string
    userAgent?: string
  }) => {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      module: params.module,
      action: params.action,
      userId: params.userId ?? null,
      entityId: params.entityId ?? null,
      dataBefore:
        params.dataBefore === undefined ? Prisma.JsonNull : (params.dataBefore as Prisma.InputJsonValue),
      dataAfter:
        params.dataAfter === undefined ? Prisma.JsonNull : (params.dataAfter as Prisma.InputJsonValue),
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    }

    await prisma.auditLog.create({ data })
  },
}
