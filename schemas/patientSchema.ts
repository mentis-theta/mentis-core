import { z } from 'zod';

export const patientSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }).max(100),
  displayName: z.string().optional(),
  cpf: z.string().min(11, { message: 'O CPF precisa ter pelo menos 11 dígitos.' }),
  email: z.string().email({ message: 'E-mail com formato inválido.' }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  birthDate: z.string().min(1, { message: 'A data de nascimento é obrigatória.' }),
  medicalHistory: z.string().optional(),
  consent: z.boolean().optional(),
  paymentType: z.enum(['particular', 'plano']),
  healthPlan: z.string().optional(),
  agreedPrice: z.coerce.number().min(0, { message: 'O valor não pode ser negativo.' }),
  photoUrl: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived', 'discharged']),
  address: z.string().optional(),
  defaultLocation: z.string().optional(),
  defaultModality: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.paymentType === 'plano' && (!data.healthPlan || data.healthPlan.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Nome do plano de saúde é obrigatório.',
      path: ['healthPlan']
    });
  }
});

export type PatientFormData = z.infer<typeof patientSchema>;
