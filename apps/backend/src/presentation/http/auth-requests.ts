import { z } from "zod";

export const LoginRequestBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

export type LoginRequestBody = z.infer<typeof LoginRequestBodySchema>;
