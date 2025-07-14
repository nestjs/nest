import { ApplicationConfig } from '@nestjs/core/application-config';
import { GraphInspector } from '@nestjs/core/inspector/graph-inspector';
import { Transport } from '@nestjs/microservices/enums';
import { AsyncMicroserviceOptions } from '@nestjs/microservices/interfaces';
import { NestMicroservice } from '@nestjs/microservices/nest-microservice';
import { Server, ServerTCP } from '@nestjs/microservices/server';
import { expect } from 'chai';
import * as sinon from 'sinon';

const createMockGraphInspector = (): GraphInspector =>
  ({
    insertOrphanedEnhancer: sinon.stub(),
  }) as unknown as GraphInspector;

const createMockAppConfig = (): ApplicationConfig =>
  ({
    useGlobalFilters: sinon.stub(),
    useGlobalPipes: sinon.stub(),
    useGlobalGuards: sinon.stub(),
    useGlobalInterceptors: sinon.stub(),
    setIoAdapter: sinon.stub(),
  }) as unknown as ApplicationConfig;

const mockContainer = {
  getModuleCompiler: sinon.stub(),
  getModules: () =>
    Object.assign(new Map(), {
      addRpcTarget: sinon.spy(),
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
    sinon.restore();
  });

  it('should use ServerFactory if no strategy is provided', () => {
    const instance = new NestMicroservice(
      mockContainer,
      { transport: Transport.TCP },
      mockGraphInspector,
      mockAppConfig,
    );

    expect((instance as any).serverInstance).to.be.instanceOf(ServerTCP);
  });

  it('should use provided strategy if present in config', () => {
    const strategy = new (class extends Server {
      listen = sinon.spy();
      close = sinon.spy();
      on = sinon.stub();
      unwrap = sinon.stub();
    })();

    const instance = new NestMicroservice(
      mockContainer,
      { strategy },
      mockGraphInspector,
      mockAppConfig,
    );

    expect((instance as any).serverInstance).to.equal(strategy);
  });

  it('should use strategy resolved from useFactory config', () => {
    const strategy = new (class extends Server {
      listen = sinon.spy();
      close = sinon.spy();
      on = sinon.stub();
      unwrap = sinon.stub();
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

    expect((instance as any).serverInstance).to.equal(strategy);
  });

  it('should call listen() on server when listen() is called', async () => {
    const listenSpy = sinon.spy((cb: () => void) => cb());
    const strategy = new (class extends Server {
      listen = listenSpy;
      close = sinon.spy();
      on = sinon.stub();
      unwrap = sinon.stub();
    })();

    const instance = new NestMicroservice(
      mockContainer,
      { strategy },
      mockGraphInspector,
      mockAppConfig,
    );

    await instance.listen();
    expect(listenSpy.calledOnce).to.be.true;
  });

  it('should delegate unwrap() to server', () => {
    const unwrapStub = sinon.stub().returns('core');
    const strategy = new (class extends Server {
      listen = sinon.spy();
      close = sinon.spy();
      on = sinon.stub();
      unwrap = unwrapStub;
    })();

    const instance = new NestMicroservice(
      mockContainer,
      { strategy },
      mockGraphInspector,
      mockAppConfig,
    );

    expect(instance.unwrap()).to.equal('core');
  });

  it('should delegate on() to server', () => {
    const onStub = sinon.stub();
    const strategy = new (class extends Server {
      listen = sinon.spy();
      close = sinon.spy();
      on = onStub;
      unwrap = sinon.stub();
    })();

    const instance = new NestMicroservice(
      mockContainer,
      { strategy },
      mockGraphInspector,
      mockAppConfig,
    );

    const cb = () => {};
    instance.on('test:event', cb);
    expect(onStub.calledWith('test:event', cb)).to.be.true;
  });
});
