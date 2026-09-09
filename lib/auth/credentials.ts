import { z } from "zod";

/** Shared validation for Auth.js and its Server Action entry point. */
export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  companyId: z.string().uuid().optional(),
});
