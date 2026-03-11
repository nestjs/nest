import {
  BadRequestException,
  CallHandler,
  CanActivate,
  ExecutionContext,
  ExceptionFilter,
  HttpException,
  INestApplication,
  Injectable,
  NestInterceptor,
  PipeTransform,
  UseFilters,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import { MinLength, IsString } from 'class-validator';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { map, Observable } from 'rxjs';
import { z } from 'zod';
import { TrpcContext } from '../../decorators/ctx.decorator';
import { Input } from '../../decorators/input.decorator';
import {
  Mutation,
  Query,
  Subscription,
} from '../../decorators/procedure.decorator';
import { Router } from '../../decorators/router.decorator';
import { TrpcModule } from '../../trpc.module';
import { TrpcRouter } from '../../trpc-router';

@Injectable()
class DenyGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return false;
  }
}

@Injectable()
class AllowGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

@Injectable()
class UppercasePipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (value && typeof value === 'object' && 'text' in value) {
      const input = value as { text?: unknown };
      if (typeof input.text === 'string') {
        return { ...input, text: input.text.toUpperCase() };
      }
    }
    return value;
  }
}

@Injectable()
class WrapInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map(value => `wrapped:${String(value)}`));
  }
}

@Router('lifecycle')
@UseInterceptors(WrapInterceptor)
class LifecycleRouter {
  @Query({ input: z.object({ text: z.string() }) })
  @UsePipes(UppercasePipe)
  uppercase(input: { text: string }) {
    return input.text;
  }

  @Mutation()
  @UseGuards(DenyGuard)
  blocked() {
    return 'should-not-run';
  }

  @Mutation()
  @UseGuards(AllowGuard)
  allowed() {
    return 'ok';
  }

  @Query({ input: z.object({ text: z.string() }) })
  decoratorParams(
    @Input('text') text: string,
    @TrpcContext('suffix') suffix: string,
  ) {
    return `${text}${suffix}`;
  }
}

@Router('events')
class EventsRouter {
  @Subscription()
  async *stream() {
    yield 'tick';
  }

  @Subscription()
  once() {
    return 'one';
  }

  @Subscription({ output: z.object({ tick: z.number() }) })
  async *validated() {
    yield { tick: 1 };
  }

  @Subscription({ output: z.object({ tick: z.number() }) })
  async *invalid() {
    yield { nope: true } as any;
  }
}

class CreateMessageDto {
  @IsString()
  @MinLength(3)
  text!: string;
}

@Injectable()
class RemapBadRequestFilter implements ExceptionFilter<BadRequestException> {
  catch(_exception: BadRequestException): never {
    throw new HttpException('filtered payload', 422);
  }
}

@Router('compat')
class CompatibilityRouter {
  @Mutation({ input: z.any() })
  @UsePipes(new ValidationPipe({ transform: true }))
  dtoValidation(input: CreateMessageDto) {
    return {
      isDtoInstance: input instanceof CreateMessageDto,
      text: input.text,
    };
  }

  @Mutation()
  @UseFilters(RemapBadRequestFilter)
  filteredException() {
    throw new BadRequestException('raw payload');
  }
}

@Injectable()
class GlobalContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const [, trpcCtx] = context.getArgs();
    return (trpcCtx as { allow?: boolean })?.allow !== false;
  }
}

@Injectable()
class GlobalSuffixPipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (value && typeof value === 'object' && 'text' in value) {
      const input = value as { text?: unknown };
      if (typeof input.text === 'string') {
        return {
          ...input,
          text: `${input.text}!`,
        };
      }
    }
    return value;
  }
}

@Injectable()
class GlobalPrefixInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map(value => `global:${String(value)}`));
  }
}

@Router('global')
class GlobalLifecycleRouter {
  @Query({ input: z.object({ text: z.string() }) })
  echo(input: { text: string }) {
    return input.text;
  }

  @Mutation()
  secured() {
    return 'ok';
  }
}

describe('TrpcRouter Lifecycle', () => {
  let moduleRef: TestingModule;
  let trpcRouter: TrpcRouter;
  let tmpDir: string;
  let generatedSchemaPath: string;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'trpc-schema-'));
    generatedSchemaPath = join(tmpDir, 'generated', 'server.ts');

    moduleRef = await Test.createTestingModule({
      imports: [
        TrpcModule.forRoot({
          path: '/trpc',
          autoSchemaFile: generatedSchemaPath,
        }),
      ],
      providers: [
        LifecycleRouter,
        EventsRouter,
        CompatibilityRouter,
        DenyGuard,
        AllowGuard,
        UppercasePipe,
        WrapInterceptor,
        RemapBadRequestFilter,
      ],
    }).compile();

    await moduleRef.init();
    trpcRouter = moduleRef.get(TrpcRouter);
  });

  afterEach(async () => {
    await moduleRef.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should apply pipes and interceptors around query handlers', async () => {
    const caller = trpcRouter.getRouter().createCaller({ suffix: '!' }) as any;
    const result = await caller.lifecycle.uppercase({ text: 'hello' });
    expect(result).to.equal('wrapped:HELLO');
  });

  it('should deny guarded handlers and allow permitted handlers', async () => {
    const caller = trpcRouter.getRouter().createCaller({ suffix: '!' }) as any;

    let error: Error | undefined;
    try {
      await caller.lifecycle.blocked();
    } catch (err) {
      error = err as Error;
    }

    expect(error).to.be.instanceOf(Error);
    expect(error?.message).to.match(/forbidden/i);
    expect(await caller.lifecycle.allowed()).to.equal('wrapped:ok');
  });

  it('should resolve @Input and @TrpcContext parameter decorators', async () => {
    const caller = trpcRouter.getRouter().createCaller({ suffix: '!' }) as any;
    const result = await caller.lifecycle.decoratorParams({ text: 'nest' });
    expect(result).to.equal('wrapped:nest!');
  });

  it('should support subscription handlers returning iterables and scalar values', async () => {
    const caller = trpcRouter.getRouter().createCaller({ suffix: '!' }) as any;

    const stream = await caller.events.stream();
    const first = await stream.next();
    expect(first.value).to.equal('tick');
    expect(first.done).to.equal(false);
    const second = await stream.next();
    expect(second.done).to.equal(true);

    const once = await caller.events.once();
    const onceFirst = await once.next();
    expect(onceFirst.value).to.equal('one');
    expect(onceFirst.done).to.equal(false);
    const onceSecond = await once.next();
    expect(onceSecond.done).to.equal(true);
  });

  it('should validate subscription outputs when output schemas are configured', async () => {
    const caller = trpcRouter.getRouter().createCaller({ suffix: '!' }) as any;

    const validated = await caller.events.validated();
    const validatedFirst = await validated.next();
    expect(validatedFirst.value).to.deep.equal({ tick: 1 });
    expect(validatedFirst.done).to.equal(false);

    const invalid = await caller.events.invalid();
    let error: Error | undefined;
    try {
      await invalid.next();
    } catch (err) {
      error = err as Error;
    }

    expect(error).to.be.instanceOf(Error);
    expect(String(error?.message)).to.match(/(tick|required|output)/i);
  });

  it('should generate AppRouter types when autoSchemaFile is configured', () => {
    const generated = readFileSync(generatedSchemaPath, 'utf-8');
    expect(generated).to.include('export type AppRouter = typeof appRouter;');
    expect(generated).to.include('lifecycle: t.router({');
    expect(generated).to.include('events: t.router({');
  });

  it('should support class-validator DTO validation through ValidationPipe', async () => {
    const caller = trpcRouter.getRouter().createCaller({}) as any;
    const valid = await caller.compat.dtoValidation({ text: 'hello' });
    expect(valid).to.deep.equal({ isDtoInstance: true, text: 'hello' });

    let error: Error | undefined;
    try {
      await caller.compat.dtoValidation({ text: 'x' });
    } catch (err) {
      error = err as Error;
    }

    expect(error).to.be.instanceOf(Error);
    expect(String(error?.message)).to.match(/(least|minimal|3)/i);
  });

  it('should apply method-level exception filters before mapping to TRPCError', async () => {
    const caller = trpcRouter.getRouter().createCaller({}) as any;

    let error: any;
    try {
      await caller.compat.filteredException();
    } catch (err) {
      error = err;
    }

    expect(error).to.not.be.undefined;
    expect(error.code).to.equal('UNPROCESSABLE_CONTENT');
    expect(String(error.message)).to.include('filtered payload');
  });
});

describe('TrpcRouter Global Lifecycle', () => {
  let app: INestApplication;
  let trpcRouter: TrpcRouter;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TrpcModule.forRoot({ path: '/trpc' })],
      providers: [
        GlobalLifecycleRouter,
        GlobalContextGuard,
        GlobalSuffixPipe,
        GlobalPrefixInterceptor,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalGuards(app.get(GlobalContextGuard));
    app.useGlobalPipes(app.get(GlobalSuffixPipe));
    app.useGlobalInterceptors(app.get(GlobalPrefixInterceptor));

    await app.init();
    trpcRouter = app.get(TrpcRouter);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should apply global pipes and global interceptors to procedures', async () => {
    const caller = trpcRouter.getRouter().createCaller({ allow: true }) as any;
    const result = await caller.global.echo({ text: 'hello' });
    expect(result).to.equal('global:hello!');
  });

  it('should apply global guards to procedures', async () => {
    const deniedCaller = trpcRouter
      .getRouter()
      .createCaller({ allow: false }) as any;

    let error: Error | undefined;
    try {
      await deniedCaller.global.secured();
    } catch (err) {
      error = err as Error;
    }

    expect(error).to.be.instanceOf(Error);
    expect(error?.message).to.match(/forbidden/i);

    const allowedCaller = trpcRouter
      .getRouter()
      .createCaller({ allow: true }) as any;
    expect(await allowedCaller.global.secured()).to.equal('global:ok');
  });
});
