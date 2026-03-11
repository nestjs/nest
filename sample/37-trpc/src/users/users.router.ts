import {
  BadRequestException,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Input, Mutation, Query, Router, TrpcContext } from '@nestjs/trpc';
import { UsersService } from './users.service';
import {
  CreateUserSchema,
  UserIdSchema,
  UserSchema,
  UserSearchSchema,
} from './users.schema';
import { AuthGuard } from '../common/guards/auth.guard';
import { TrimPipe } from '../common/pipes/trim.pipe';
import { z } from 'zod';
import { CreateUserDto } from './create-user.dto';
import { RemapBadRequestFilter } from '../common/filters/remap-bad-request.filter';

/**
 * Users tRPC router — demonstrates:
 * - Aliased sub-router (`@Router('users')`)
 * - Zod enum schemas
 * - NestJS pipe integration (`@UsePipes`)
 * - Guard-protected mutations
 */
@Router('users')
export class UsersRouter {
  constructor(private readonly usersService: UsersService) {}

  @Query({ output: z.array(UserSchema) })
  list() {
    return this.usersService.findAll();
  }

  @Query({
    input: UserIdSchema,
    output: UserSchema.nullable(),
  })
  byId(@Input() input: { id: number }) {
    return this.usersService.findById(input.id) ?? null;
  }

  @Query({
    input: UserSearchSchema,
    output: z.array(UserSchema),
  })
  @UsePipes(TrimPipe)
  search(
    @Input('query') query: string,
    @TrpcContext('requestId') _requestId: string,
  ) {
    return this.usersService.search(query);
  }

  @Mutation({
    input: CreateUserSchema,
    output: UserSchema,
  })
  @UseGuards(AuthGuard)
  create(@Input() input: { name: string; email: string; role?: string }) {
    return this.usersService.create(input as any);
  }

  @Mutation({
    input: UserIdSchema,
    output: UserSchema.nullable(),
  })
  @UseGuards(AuthGuard)
  remove(@Input() input: { id: number }) {
    return this.usersService.remove(input.id) ?? null;
  }

  @Mutation({ input: z.any(), output: UserSchema })
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  createWithDto(@Input() input: CreateUserDto) {
    return this.usersService.create({
      ...input,
      role: input.role ?? 'user',
    });
  }

  @Mutation()
  @UseFilters(RemapBadRequestFilter)
  filteredError() {
    throw new BadRequestException('invalid raw payload');
  }
}
