import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Scope,
  UseGuards,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Router, Query, Mutation } from '@nestjs/trpc';
import { z } from 'zod';

@Injectable()
export class DenyGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return false;
  }
}

@Injectable()
export class GlobalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getHandler().name !== 'globalProtected') {
      return true;
    }
    const [, trpcCtx] = context.getArgs();
    return (trpcCtx as { globalAuth?: boolean })?.globalAuth === true;
  }
}

@Injectable({ scope: Scope.REQUEST })
export class RequestScopedUsersContextService {
  constructor(@Inject(REQUEST) private readonly request: any) {}

  getRequestId(): string {
    return String(this.request?.headers?.['x-request-id'] ?? 'missing');
  }
}

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

@Router('users')
export class UsersRouter {
  constructor(
    private readonly requestScopedUsersContextService: RequestScopedUsersContextService,
  ) {}

  private users = [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
    { id: '2', name: 'Bob', email: 'bob@example.com' },
  ];

  @Query('list')
  list() {
    return this.users;
  }

  @Query('byId', { input: z.object({ id: z.string() }) })
  byId(input: { id: string }) {
    return this.users.find(u => u.id === input.id) ?? null;
  }

  @Mutation('create', { input: createUserSchema, output: userSchema })
  create(input: { name: string; email: string }) {
    const user = {
      id: String(this.users.length + 1),
      name: input.name,
      email: input.email,
    };
    this.users.push(user);
    return user;
  }

  @Mutation('blocked')
  @UseGuards(DenyGuard)
  blocked() {
    return { ok: true };
  }

  @Mutation('explode')
  explode() {
    throw new BadRequestException('invalid user payload');
  }

  @Query('requestScoped')
  requestScoped() {
    return this.requestScopedUsersContextService.getRequestId();
  }

  @Mutation('globalProtected')
  globalProtected() {
    return { ok: true };
  }
}
