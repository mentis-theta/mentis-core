import { z } from 'zod';

export const ClassifierResponseItemSchema = z.object({
    id: z.number(),
    origin: z.enum(['patient', 'psychologist']),
    strength: z.enum(['direct', 'indirect', 'clinicalInference']),
    certainty: z.enum(['high', 'moderate', 'low']),
    evidence_level: z.number().min(1).max(5),
    value: z.union([z.string(), z.number()])
});

export const ClassifierResponseSchema = z.array(ClassifierResponseItemSchema);

export type ClassifierResponseItem = z.infer<typeof ClassifierResponseItemSchema>;
