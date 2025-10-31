// index.d.ts
import { AuthTokenPayload } from '@app-types/auth'

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload
    }
  }
}

// Declaración temporal para que TS acepte Luxon
declare module 'luxon'
// Obligatorio para que TypeScript trate este archivo como módulo
export { }

 
export type MergeOptions = {
  allowedKeys?: string[];
  onError?: "throw" | "ignore";
};

