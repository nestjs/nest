import {
  Controller,
  Get,
  type INestApplication,
  Injectable,
  Module,
} from '@nestjs/common';
import * as internal from '@nestjs/common/internal';
import {
  ExpressAdapter,
  type NestExpressApplication,
} from '@nestjs/platform-express';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { NodeAdapter, type NestNodeApplication } from '@nestjs/platform-node';
import type { Http2Server } from 'node:http2';
import type { AbstractHttpAdapter } from '../adapters/http-adapter.js';
import { NestFactory } from '../nest-factory.js';
import type { NoopHttpAdapter } from './utils/noop-adapter.js';

@Module({})
class TestModule {}

@Injectable()
class TestService {}

interface CustomApplication extends INestApplication {
  customMethod(): void;
}

declare abstract class CustomAdapter extends AbstractHttpAdapter<
  unknown,
  unknown,
  unknown,
  CustomApplication
> {
  abortOnError: boolean;
}

@Controller()
class TestController {
  @Get()
  hello() {
    return 'hello';
  }
}

const rootModuleOf = (app: { get: Function }) =>
  [...(app as any).container.getModules().values()]
    .map(moduleRef => moduleRef.metatype)
    .find(metatype => metatype.name === 'AppModule');

describe('NestFactory', () => {
  describe('create() types', () => {
    it('should infer the application type from the HTTP adapter', () => {
      // Check the return types without bootstrapping applications.
      expectTypeOf(() =>
        NestFactory.create(TestModule, new NodeAdapter()),
      ).returns.toEqualTypeOf<Promise<NestNodeApplication>>();
      expectTypeOf(() =>
        NestFactory.create(TestModule, new ExpressAdapter()),
      ).returns.toEqualTypeOf<Promise<NestExpressApplication>>();
      expectTypeOf(() =>
        NestFactory.create(TestModule, new FastifyAdapter()),
      ).returns.toEqualTypeOf<Promise<NestFastifyApplication>>();
      expectTypeOf(() =>
        NestFactory.create(
          TestModule,
          new FastifyAdapter<Http2Server>({ http2: true }),
          { logger: false },
        ),
      ).returns.toEqualTypeOf<Promise<NestFastifyApplication<Http2Server>>>();
      expectTypeOf((adapter: CustomAdapter) =>
        NestFactory.create(TestModule, adapter),
      ).returns.toEqualTypeOf<Promise<CustomApplication>>();
      expectTypeOf((adapter: NodeAdapter | ExpressAdapter) =>
        NestFactory.create(TestModule, adapter),
      ).returns.toEqualTypeOf<
        Promise<NestNodeApplication | NestExpressApplication>
      >();
    });

    it('should preserve fallback and caller-supplied application types', () => {
      expectTypeOf(() => {
        const adapter: AbstractHttpAdapter = new NodeAdapter();
        return NestFactory.create(TestModule, adapter);
      }).returns.toEqualTypeOf<Promise<INestApplication>>();
      expectTypeOf((adapter: NoopHttpAdapter) =>
        NestFactory.create(TestModule, adapter),
      ).returns.toEqualTypeOf<Promise<INestApplication>>();
      expectTypeOf((adapter: any) =>
        NestFactory.create(TestModule, adapter),
      ).returns.toEqualTypeOf<Promise<INestApplication>>();
      expectTypeOf(() => NestFactory.create(TestModule)).returns.toEqualTypeOf<
        Promise<INestApplication>
      >();
      expectTypeOf(() =>
        NestFactory.create(TestModule, { logger: false }),
      ).returns.toEqualTypeOf<Promise<INestApplication>>();
      expectTypeOf(() =>
        NestFactory.create<CustomApplication>(TestModule, new NodeAdapter()),
      ).returns.toEqualTypeOf<Promise<CustomApplication>>();
      expectTypeOf(() =>
        NestFactory.create<never>(TestModule, new NodeAdapter()),
      ).returns.toEqualTypeOf<Promise<never>>();
      expectTypeOf(() =>
        NestFactory.create<any>(TestModule, new NodeAdapter()),
      ).returns.toEqualTypeOf<Promise<any>>();
      expectTypeOf(() =>
        NestFactory.create<CustomApplication>(TestModule, { logger: false }),
      ).returns.toEqualTypeOf<Promise<CustomApplication>>();
      expectTypeOf((): Promise<CustomApplication> =>
        NestFactory.create(TestModule, new NodeAdapter()),
      ).returns.toEqualTypeOf<Promise<CustomApplication>>();

      const createWithContext = <T extends INestApplication>(): Promise<T> =>
        NestFactory.create(TestModule, new NodeAdapter());
      expectTypeOf(createWithContext<CustomApplication>).returns.toEqualTypeOf<
        Promise<CustomApplication>
      >();
    });
  });

  describe('create()', () => {
    let requestedPackages: string[];

    beforeEach(() => {
      requestedPackages = [];
      vi.spyOn(internal, 'tryLoadPackage').mockImplementation(
        async (name: string) => {
          requestedPackages.push(name);
          return null as any;
        },
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should not request @nestjs/platform-express when an adapter is passed', async () => {
      const app = await NestFactory.create(TestModule, new FastifyAdapter(), {
        logger: false,
      });
      await app.close();

      expect(requestedPackages).not.toContain('@nestjs/platform-express');
    });

    it('should still preload @nestjs/microservices', async () => {
      const app = await NestFactory.create(TestModule, new FastifyAdapter(), {
        logger: false,
      });
      await app.close();

      expect(requestedPackages).toContain('@nestjs/microservices');
    });
  });

  describe('when passed module metadata', () => {
    it('should create an application from the metadata', async () => {
      const app = await NestFactory.create(
        { controllers: [TestController], providers: [TestService] },
        new FastifyAdapter(),
        { logger: false },
      );
      await app.init();

      const response = await app.inject({
        method: 'GET',
        url: '/',
      });
      expect(response.payload).toBe('hello');
      expect(app.get(TestService)).toBeInstanceOf(TestService);
      expect(rootModuleOf(app)).toBeDefined();

      await app.close();
    });

    it('should create an application context from the metadata', async () => {
      const context = await NestFactory.createApplicationContext(
        { providers: [TestService] },
        { logger: false },
      );

      expect(context.get(TestService)).toBeInstanceOf(TestService);
      await context.close();
    });

    it('should resolve a promise of the metadata', async () => {
      const context = await NestFactory.createApplicationContext(
        Promise.resolve({ providers: [TestService] }),
        { logger: false },
      );

      expect(context.get(TestService)).toBeInstanceOf(TestService);
      await context.close();
    });

    it('should accept imports in the metadata', async () => {
      @Module({ providers: [TestService], exports: [TestService] })
      class FeatureModule {}

      const context = await NestFactory.createApplicationContext(
        { imports: [FeatureModule] },
        { logger: false },
      );

      expect(context.get(TestService)).toBeInstanceOf(TestService);
      await context.close();
    });

    it('should reject an unknown metadata key', async () => {
      await expect(
        NestFactory.createApplicationContext(
          { controller: [TestController] } as any,
          { logger: false, abortOnError: false },
        ),
      ).rejects.toThrow(/Invalid property 'controller'/);
    });

    it('should reject a module namespace object', async () => {
      const namespace = Object.assign(Object.create(null), {
        TestModule,
      });

      await expect(
        NestFactory.createApplicationContext(namespace, {
          logger: false,
          abortOnError: false,
        }),
      ).rejects.toThrow(/Invalid property 'TestModule'/);
    });

    it('should create a microservice from the metadata', async () => {
      const app = await NestFactory.createMicroservice(
        { providers: [TestService] },
        { logger: false },
      );

      expect(app.get(TestService)).toBeInstanceOf(TestService);
      await app.close();
    });

    it('should create a distinct root module for each call', async () => {
      const first = await NestFactory.createApplicationContext(
        { providers: [TestService] },
        { logger: false },
      );
      const second = await NestFactory.createApplicationContext(
        { providers: [TestService] },
        { logger: false },
      );

      expect(rootModuleOf(first)).not.toBe(rootModuleOf(second));
      await first.close();
      await second.close();
    });
  });
});
