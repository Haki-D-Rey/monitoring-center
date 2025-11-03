// src/services/password-reset.ts
import { PrismaClient } from '@prisma/client';
import moment from 'moment-timezone';
import { generateNumericCode, randomToken, sha256Hex } from '@app-utils/security';
import { sendResetCodeEmail } from '@src/services/mailer/mailer';

const prisma = new PrismaClient();

const CODE_TTL_MIN = 10;
const TOKEN_TTL_MIN = 15;
const MAX_ATTEMPTS = 5;

// Helper: ahora/UTC
const nowUtc = () => moment.utc();

export async function createAndSendResetCode(args: {
    email: string;
    ip?: string;
    userAgent?: string;
}) {
    const { email, ip, userAgent } = args;
    const normalizedEmail = email.toLocaleLowerCase().trim();

    const code = generateNumericCode(6);
    const codeHash = sha256Hex(code);
    const expiresAt = nowUtc().add(CODE_TTL_MIN, 'minutes').toDate(); // ← moment

    // invalidar códigos previos no usados
    await prisma.passwordReset.updateMany({
        where: { email: normalizedEmail, usedAt: null },
        data: { expiresAt: new Date(0) },
    });

    await prisma.passwordReset.create({
        data: {
            email: normalizedEmail,
            codeHash,
            expiresAt,
            ip: ip ?? null,
            userAgent: userAgent ?? null,
        },
    });

    await sendResetCodeEmail({ to: email, code, url: './../../../public/assets/pame-logo-t.png' });
}

/**
 * Verifica el código y emite un token temporal (almacenado como hash)
 */
export async function verifyCodeAndIssueToken(args: {
    email: string;
    code: string;
    ip?: string;
    userAgent?: string;
}) {
    const { email, code, ip, userAgent } = args;
    const codeHash = sha256Hex(code);

    const record = await prisma.passwordReset.findFirst({
        where: { email, usedAt: null },
        orderBy: { createdAt: 'desc' },
    });

    if (!record) throw new Error('Código no encontrado');

    if (record.attempts >= MAX_ATTEMPTS) {
        throw new Error('Demasiados intentos. Solicita un nuevo código');
    }

    // expirado?
    if (nowUtc().isAfter(moment.utc(record.expiresAt))) {
        throw new Error('Código expirado');
    }

    // comparar hash
    if (record.codeHash !== codeHash) {
        await prisma.passwordReset.update({
            where: { id: record.id },
            data: { attempts: { increment: 1 } },
        });
        throw new Error('Código inválido');
    }

    // OK: emitir token temporal
    const token = randomToken(32);
    const resetTokenHash = sha256Hex(token);
    const resetTokenExpiresAt = nowUtc().add(TOKEN_TTL_MIN, 'minutes').toDate();

    await prisma.passwordReset.update({
        where: { id: record.id },
        data: {
            resetTokenHash,
            resetTokenExpiresAt,
            attempts: { increment: 1 }, // cuenta el intento válido
            ip: ip ?? record.ip,
            userAgent: userAgent ?? record.userAgent,
        },
    });

    return { resetToken: token, expiresAt: resetTokenExpiresAt };
}

/**
 * Consume token y resetea contraseña (inválida todo lo previo)
 */
export async function consumeTokenAndResetPassword(args: {
    email: string;
    resetToken: string;
    newPasswordHash: string;
}) {
    const { email, resetToken, newPasswordHash } = args;

    const rec = await prisma.passwordReset.findFirst({
        where: { email, usedAt: null, resetTokenHash: sha256Hex(resetToken) },
        orderBy: { createdAt: 'desc' },
    });

    if (!rec) throw new Error('Token inválido');

    if (
        !rec.resetTokenExpiresAt ||
        nowUtc().isAfter(moment.utc(rec.resetTokenExpiresAt))
    ) {
        throw new Error('Token expirado');
    }

    // Actualiza contraseña
    await prisma.user.update({
        where: { email },
        data: { password: newPasswordHash },
    });

    // Marca como usado e invalida hermanos
    await prisma.passwordReset.update({
        where: { id: rec.id },
        data: { usedAt: new Date() },
    });

    await prisma.passwordReset.updateMany({
        where: { email, usedAt: null },
        data: { expiresAt: new Date(0), resetTokenExpiresAt: new Date(0) },
    });
}
