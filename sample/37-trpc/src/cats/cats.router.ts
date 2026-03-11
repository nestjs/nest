import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Input, Mutation, Query, Router } from '@nestjs/trpc';
import { CatsService } from './cats.service';
import {
  CatFilterSchema,
  CatIdSchema,
  CatSchema,
  CreateCatSchema,
  UpdateCatSchema,
} from './cats.schema';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { AuthGuard } from '../common/guards/auth.guard';
import { z } from 'zod';

/**
 * Cats tRPC router — demonstrates:
 * - Aliased sub-router (`@Router('cats')`)
 * - Zod input/output schemas for type-safe procedures
 * - NestJS guard integration (`@UseGuards`)
 * - NestJS interceptor integration (`@UseInterceptors`)
 * - Service injection via NestJS DI
 */
@Router('cats')
@UseInterceptors(LoggingInterceptor)
export class CatsRouter {
  constructor(private readonly catsService: CatsService) {}

  @Query({
    input: CatFilterSchema,
    output: z.array(CatSchema),
  })
  list(@Input() input: { breed?: string; minAge?: number; maxAge?: number }) {
    return this.catsService.findAll(input);
  }

  @Query({
    input: CatIdSchema,
    output: CatSchema.nullable(),
  })
  byId(@Input() input: { id: number }) {
    return this.catsService.findById(input.id) ?? null;
  }

  @Mutation({
    input: CreateCatSchema,
    output: CatSchema,
  })
  @UseGuards(AuthGuard)
  create(@Input() input: { name: string; age: number; breed: string }) {
    return this.catsService.create(input);
  }

  @Mutation({
    input: UpdateCatSchema,
    output: CatSchema.nullable(),
  })
  @UseGuards(AuthGuard)
  update(
    @Input() input: { id: number; name?: string; age?: number; breed?: string },
  ) {
    return this.catsService.update(input) ?? null;
  }

  @Mutation({
    input: CatIdSchema,
    output: CatSchema.nullable(),
  })
  @UseGuards(AuthGuard)
  remove(@Input() input: { id: number }) {
    return this.catsService.remove(input.id) ?? null;
  }
}
