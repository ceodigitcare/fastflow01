import { z } from "zod";

// Authentication schema
export const authenticateUser = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type AuthCredentials = z.infer<typeof authenticateUser>;
