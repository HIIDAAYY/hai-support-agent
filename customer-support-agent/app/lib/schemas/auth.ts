import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(100),
  password: z.string().min(1, 'Password is required').max(200),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ResetPasswordSchema = z.object({
  username: z.string().trim().min(1).max(100),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(200),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
