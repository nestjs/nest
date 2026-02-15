import {
  Controller,
  Get,
  INestApplication,
  Module,
  SerializeOptions,
  StandardSchemaSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import request from 'supertest';

// ─── Test schemas ──────────────────────────────────────────────

/**
 * Schema that strips out the `password` field (simulating a "safe user" DTO).
 */
const safeUserSchema: StandardSchemaV1 = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value: unknown) => {
      const { password, ...safe } = value as Record<string, unknown>;
      return { value: safe };
    },
  },
};

/**
 * Schema that adds a `serialized: true` flag (useful for asserting the schema ran).
 */
const flagSchema: StandardSchemaV1 = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value: unknown) => ({
      value: { ...(value as any), serialized: true },
    }),
  },
};

/**
 * Schema that always fails — used for the error case.
 */
const failingSchema: StandardSchemaV1 = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: () => ({
      issues: [{ message: 'not allowed' }],
    }),
  },
};

/**
 * Async schema — validates that the interceptor awaits promises.
 */
const asyncSchema: StandardSchemaV1 = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: async (value: unknown) => ({
      value: { ...(value as any), async: true },
    }),
  },
};

// ─── Controllers ───────────────────────────────────────────────

@Controller('serializer')
@UseInterceptors(StandardSchemaSerializerInterceptor)
class SerializerTestController {
  @Get('user')
  @SerializeOptions({ schema: safeUserSchema })
  getUser() {
    return { id: 1, name: 'Alice', password: 'secret123' };
  }

  @Get('users')
  @SerializeOptions({ schema: safeUserSchema })
  getUsers() {
    return [
      { id: 1, name: 'Alice', password: 'pw1' },
      { id: 2, name: 'Bob', password: 'pw2' },
    ];
  }

  @Get('flagged')
  @SerializeOptions({ schema: flagSchema })
  getFlagged() {
    return { id: 1 };
  }

  @Get('no-schema')
  getNoSchema() {
    return { id: 1, secret: 'visible' };
  }

  @Get('failing')
  @SerializeOptions({ schema: failingSchema })
  getFailing() {
    return { id: 1 };
  }

  @Get('async')
  @SerializeOptions({ schema: asyncSchema })
  getAsync() {
    return { id: 1 };
  }

  @Get('primitive')
  @SerializeOptions({ schema: failingSchema })
  getPrimitive() {
    return 'plain string';
  }
}

/**
 * Controller-level schema applied via class decorator — all routes inherit it.
 */
@Controller('class-level')
@UseInterceptors(StandardSchemaSerializerInterceptor)
@SerializeOptions({ schema: safeUserSchema })
class ClassLevelSerializerController {
  @Get('user')
  getUser() {
    return { id: 1, name: 'Carol', password: 'secret' };
  }

  @Get('override')
  @SerializeOptions({ schema: flagSchema })
  getOverride() {
    return { id: 1, name: 'Carol', password: 'secret' };
  }
}

/**
 * Controller demonstrating global interceptor registration with a default schema.
 */
@Controller('global')
class GlobalSerializerController {
  @Get('default')
  getDefault() {
    return { id: 1, name: 'Dave', password: 'global-secret' };
  }

  @Get('override')
  @SerializeOptions({ schema: flagSchema })
  getOverride() {
    return { id: 1 };
  }
}

@Module({
  controllers: [SerializerTestController, ClassLevelSerializerController],
})
class SerializerTestModule {}

@Module({
  controllers: [GlobalSerializerController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) =>
        new StandardSchemaSerializerInterceptor(reflector, {
          schema: safeUserSchema,
        }),
      inject: [Reflector],
    },
  ],
})
class GlobalSerializerTestModule {}

// ─── Tests ─────────────────────────────────────────────────────

describe('StandardSchemaSerializerInterceptor (integration)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  describe('handler-level @SerializeOptions', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [SerializerTestModule],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    it('should strip fields via schema on a single object', () => {
      return request(app.getHttpServer())
        .get('/serializer/user')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ id: 1, name: 'Alice' });
          expect(body).not.toHaveProperty('password');
        });
    });

    it('should apply schema to each item in an array response', () => {
      return request(app.getHttpServer())
        .get('/serializer/users')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual([
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ]);
          body.forEach((item: any) =>
            expect(item).not.toHaveProperty('password'),
          );
        });
    });

    it('should augment response through the schema', () => {
      return request(app.getHttpServer())
        .get('/serializer/flagged')
        .expect(200)
        .expect({ id: 1, serialized: true });
    });

    it('should return response unchanged when no schema is set', () => {
      return request(app.getHttpServer())
        .get('/serializer/no-schema')
        .expect(200)
        .expect({ id: 1, secret: 'visible' });
    });

    it('should return 500 when schema validation fails', () => {
      return request(app.getHttpServer())
        .get('/serializer/failing')
        .expect(500);
    });

    it('should handle async schemas', () => {
      return request(app.getHttpServer())
        .get('/serializer/async')
        .expect(200)
        .expect({ id: 1, async: true });
    });

    it('should pass primitive values through even when a schema is set', () => {
      return request(app.getHttpServer())
        .get('/serializer/primitive')
        .expect(200)
        .expect(({ text }) => {
          expect(text).toBe('plain string');
        });
    });
  });

  describe('class-level @SerializeOptions', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [SerializerTestModule],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    it('should apply class-level schema to all routes', () => {
      return request(app.getHttpServer())
        .get('/class-level/user')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ id: 1, name: 'Carol' });
          expect(body).not.toHaveProperty('password');
        });
    });

    it('should allow handler-level schema to override class-level', () => {
      return request(app.getHttpServer())
        .get('/class-level/override')
        .expect(200)
        .expect(({ body }) => {
          // flagSchema adds `serialized: true` but does NOT strip password
          expect(body).toHaveProperty('serialized', true);
          expect(body).toHaveProperty('password', 'secret');
        });
    });
  });

  describe('global interceptor with default schema', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [GlobalSerializerTestModule],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    it('should apply the default schema globally', () => {
      return request(app.getHttpServer())
        .get('/global/default')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toEqual({ id: 1, name: 'Dave' });
          expect(body).not.toHaveProperty('password');
        });
    });

    it('should let @SerializeOptions override the global default', () => {
      return request(app.getHttpServer())
        .get('/global/override')
        .expect(200)
        .expect({ id: 1, serialized: true });
    });
  });
});
