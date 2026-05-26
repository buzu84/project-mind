import { z } from "zod";

export const projectSchema = z.object({
  name: z
    .string()
    .min(2, "Project name must be at least 2 characters.")
    .max(100, "Name must be under 100 characters."),
  description: z
    .string()
    .max(2000, "Description must be under 2,000 characters.")
    .optional()
    .transform((v) => v || undefined),
  target_users: z
    .string()
    .max(500, "Target users must be under 500 characters.")
    .optional()
    .transform((v) => v || undefined),
  market: z
    .string()
    .max(200, "Market must be under 200 characters.")
    .optional()
    .transform((v) => v || undefined),
  business_model: z
    .string()
    .max(200, "Business model must be under 200 characters.")
    .optional()
    .transform((v) => v || undefined),
  goals: z
    .string()
    .max(1000, "Goals must be under 1,000 characters.")
    .optional()
    .transform((v) => v || undefined),
});

export type ProjectFormData = z.infer<typeof projectSchema>;

export type ActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  projectId?: string;
  data?: Record<string, unknown>;
};

