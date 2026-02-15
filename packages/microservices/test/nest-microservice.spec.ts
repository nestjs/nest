import { ApplicationConfig } from '@nestjs/core/application-config.js';
import { GraphInspector } from '@nestjs/core/inspector/graph-inspector.js';
import { Transport } from '@nestjs/microservices/enums/index.js';
import { AsyncMicroserviceOptions } from '@nestjs/microservices/interfaces/index.js';
import { NestMicroservice } from '@nestjs/microservices/nest-microservice.js';
import { Server, ServerTCP } from '@nestjs/microservices/server/index.js';

const createMockGraphInspector = (): GraphInspector =>
  ({
    insertOrphanedEnhancer: vi.fn(),
  }) as unknown as GraphInspector;

const createMockAppConfig = (): ApplicationConfig =>
  ({
    useGlobalFilters: vi.fn(),
    useGlobalPipes: vi.fn(),
    useGlobalGuards: vi.fn(),
    useGlobalInterceptors: vi.fn(),
    setIoAdapter: vi.fn(),
  }) as unknown as ApplicationConfig;

const mockContainer = {
  getModuleCompiler: vi.fn(),
  getModules: () =>
    Object.assign(new Map(), {
      addRpcTarget: vi.fn(),
    }),
  get: () => null,
  getHttpAdapterHost: () => undefined,
} as any;

describe('NestMicroservice', () => {
  let mockGraphInspector: GraphInspector;
  let mockAppConfig: ApplicationConfig;

  beforeEach(() => {
    mockGraphInspector = createMockGraphInspector();
    mockAppConfig = createMockAppConfig();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use ServerFactory if no strategy is provided', () => {
    const instance = new NestMicroservice(
      mockContainer,
      { transport: Transport.TCP },
      mockGraphInspector,
      mockAppConfig,
    );

    expect((instance as any).serverInstance).toBeInstanceOf(ServerTCP);
  });

  it('should use provided strategy if present in config', () => {
    const strategy = new (class extends Server {
      listen = vi.fn();
      close = vi.fn();
      on = vi.fn();
      unwrap = vi.fn();
    })();

    const instance = new NestMicroservice(
      mockContainer,
      { strategy },
      mockGraphInspector,
      mockAppConfig,
    );

    expect((instance as any).serverInstance).toBe(strategy);
  });

  it('should use strategy resolved from useFactory config', () => {
    const strategy = new (class extends Server {
      listen = vi.fn();
      close = vi.fn();
      on = vi.fn();
      unwrap = vi.fn();
    })();
    const asyncConfig: AsyncMicroserviceOptions = {
      useFactory: () => ({ strategy }),
      inject: [],
    };

    const instance = new NestMicroservice(
      mockContainer,
      asyncConfig,
      mockGraphInspector,
      mockAppConfig,
    );

    expect((instance as any).serverInstance).toBe(strategy);
  });

  it('should call listen() on server when listen() is called', async () => {
    const listenSpy = vi.fn((cb: () => void) => cb());
    const strategy = new (class extends Server {
      listen = listenSpy;
      close = vi.fn();
      on = vi.fn();
      unwrap = vi.fn();
    })();

    const instance = new NestMicroservice(
      mockContainer,
      { strategy },
      mockGraphInspector,
      mockAppConfig,
    );

    await instance.listen();
    expect(listenSpy).toHaveBeenCalledOnce();
  });

  it('should delegate unwrap() to server', () => {
    const unwrapStub = vi.fn().mockReturnValue('core');
    const strategy = new (class extends Server {
      listen = vi.fn();
      close = vi.fn();
      on = vi.fn();
      unwrap = unwrapStub;
    })();

    const instance = new NestMicroservice(
      mockContainer,
      { strategy },
      mockGraphInspector,
      mockAppConfig,
    );

    expect(instance.unwrap()).toBe('core');
  });

  it('should delegate on() to server', () => {
    const onStub = vi.fn();
    const strategy = new (class extends Server {
      listen = vi.fn();
      close = vi.fn();
      on = onStub;
      unwrap = vi.fn();
    })();

    const instance = new NestMicroservice(
      mockContainer,
      { strategy },
      mockGraphInspector,
      mockAppConfig,
    );

    const cb = () => {};
    instance.on('test:event', cb);
    expect(onStub).toHaveBeenCalledWith('test:event', cb);
  });
});
