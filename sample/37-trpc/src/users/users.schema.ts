import { z } from 'zod';

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'moderator']),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'moderator']).default('user'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UserIdSchema = z.object({
  id: z.number().int().positive(),
});

export const UserSearchSchema = z.object({
  query: z.string().min(1),
});
