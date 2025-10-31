import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 8 caracteres' }),
  role: z.string().min(4, { message: 'El Role debe tener al menos 4 caracteres' })
})

export const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(4, { message: 'La contraseña es obligatoria y debe tener al menos 4 caracteres' })
})
