import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, { message: 'O e-mail é obrigatório.' }).email({ message: 'Formato de e-mail inválido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

export const updatePasswordSchema = z.object({
  newPassword: z.string().min(6, { message: 'A nova senha deve ter pelo menos 6 caracteres.' }),
  confirmPassword: z.string().min(1, { message: 'Confirme a senha.' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;
