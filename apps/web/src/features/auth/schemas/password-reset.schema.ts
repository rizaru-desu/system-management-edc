import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email address')),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
