import crypto from 'crypto';
import bcrypt from 'bcrypt';

export function generateNumericCode(length = 6) {
  // 000000..999999 (con padding)
  const n = Math.floor(Math.random() * 10 ** length);
  return String(n).padStart(length, '0');
}

export function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex'); // 64 chars
}

export async function hashPassword(plain: string) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}
