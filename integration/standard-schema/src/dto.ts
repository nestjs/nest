import { z } from 'zod';

/**
 * Zod schema for CreateUserDto
 */
const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  age: z.number().int().min(0).max(150).optional(),
});

/**
 * DTO with Zod schema for user creation
 */
export class CreateUserDto {
  static schema = createUserSchema;

  name: string;
  email: string;
  age?: number;
}

/**
 * Zod schema for QueryDto
 */
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

/**
 * DTO with Zod schema for query parameters
 */
export class QueryDto {
  static schema = querySchema;

  limit?: number;
  offset?: number;
}
