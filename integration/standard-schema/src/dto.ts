import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

/**
 * Zod schema for AddressDto (nested)
 */
export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid zip code format'),
  country: z.string().min(2).max(2, 'Country must be ISO 3166-1 alpha-2 code'),
});

/**
 * Nested DTO for address with Swagger documentation.
 * Uses `implements z.infer<typeof schema>` to ensure type safety.
 */
export class AddressDto implements z.infer<typeof addressSchema> {
  static schema = addressSchema;

  @ApiProperty({ description: 'Street address', example: '123 Main St' })
  declare street: string;

  @ApiProperty({ description: 'City name', example: 'New York' })
  declare city: string;

  @ApiProperty({ description: 'ZIP code (US format)', example: '10001' })
  declare zipCode: string;

  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'US',
    minLength: 2,
    maxLength: 2,
  })
  declare country: string;
}

/**
 * Zod schema for CreateUserDto with nested address
 */
export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  age: z.number().int().min(0).max(150).optional(),
  address: addressSchema.optional(),
});

/**
 * DTO with Zod schema and Swagger decorators.
 * Uses `implements z.infer<typeof schema>` to ensure type safety
 * between the Zod schema and class properties.
 */
export class CreateUserDto implements z.infer<typeof createUserSchema> {
  static schema = createUserSchema;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
    minLength: 2,
  })
  declare name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john@example.com',
    format: 'email',
  })
  declare email: string;

  @ApiPropertyOptional({
    description: 'User age',
    example: 30,
    minimum: 0,
    maximum: 150,
  })
  declare age?: number;

  @ApiPropertyOptional({
    description: 'User address',
    type: () => AddressDto,
  })
  declare address?: AddressDto;
}

/**
 * Zod schema for QueryDto
 */
export const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

/**
 * DTO with Zod schema for query parameters
 */
export class QueryDto implements z.infer<typeof querySchema> {
  static schema = querySchema;

  @ApiPropertyOptional({
    description: 'Number of items to return',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  declare limit?: number;

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    example: 0,
    minimum: 0,
  })
  declare offset?: number;
}
