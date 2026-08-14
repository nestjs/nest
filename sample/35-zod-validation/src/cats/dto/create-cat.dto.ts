import { z } from 'zod';

export const CreateCatSchema = z.object({
  name: z.string(),
  age: z.number().int(),
  breed: z.string(),
});

export type CreateCatDto = z.infer<typeof CreateCatSchema>;
