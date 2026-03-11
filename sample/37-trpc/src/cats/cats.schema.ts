import { z } from 'zod';

export const CreateCatSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
  breed: z.string().min(1),
});

export type CreateCatInput = z.infer<typeof CreateCatSchema>;

export const CatSchema = z.object({
  id: z.number(),
  name: z.string(),
  age: z.number(),
  breed: z.string(),
});

export type Cat = z.infer<typeof CatSchema>;

export const CatIdSchema = z.object({
  id: z.number().int().positive(),
});

export const UpdateCatSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  age: z.number().int().positive().optional(),
  breed: z.string().min(1).optional(),
});

export type UpdateCatInput = z.infer<typeof UpdateCatSchema>;

export const CatFilterSchema = z.object({
  breed: z.string().optional(),
  minAge: z.number().int().optional(),
  maxAge: z.number().int().optional(),
});

export type CatFilter = z.infer<typeof CatFilterSchema>;
