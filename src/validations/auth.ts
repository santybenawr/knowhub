import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'El correo es obligatorio.')
  .email('Ingresa un correo válido.')
  .max(254)
  .transform((v) => v.toLowerCase())

export const passwordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres.')
  .max(200, 'La contraseña es demasiado larga.')
  .refine((v) => /[a-zA-Z]/.test(v), 'Incluye al menos una letra.')
  .refine((v) => /[0-9]/.test(v), 'Incluye al menos un número.')

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Ingresa tu nombre.').max(80),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresa tu contraseña.'),
})

export const forgotPasswordSchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
