import { Scope } from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { NestContainer } from '@nestjs/core/injector/container.js';
import { Injector } from '@nestjs/core/injector/injector.js';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper.js';
import { GraphInspector } from '../../core/inspector/graph-inspector.js';
import { MetadataScanner } from '../../core/metadata-scanner.js';
import { ClientProxyFactory } from '../client/index.js';
import { ClientsContainer } from '../container.js';
import { ExceptionFiltersContext } from '../context/exception-filters-context.js';
import { RpcContextCreator } from '../context/rpc-context-creator.js';
import { Transport } from '../enums/transport.enum.js';
import {
  EventOrMessageListenerDefinition,
  ListenerMetadataExplorer,
} from '../listener-metadata-explorer.js';
import { ListenersController } from '../listeners-controller.js';

describe('ListenersController', () => {
  let instance: ListenersController,
    explorer: any,
    metadataExplorer: ListenerMetadataExplorer,
    server: any,
    serverTCP: any,
    serverCustom: any,
    customTransport: symbol,
    addSpy: ReturnType<typeof vi.fn>,
    addSpyTCP: ReturnType<typeof vi.fn>,
    addSpyCustom: ReturnType<typeof vi.fn>,
    proxySpy: ReturnType<typeof vi.fn>,
    container: NestContainer,
    graphInspector: GraphInspector,
    injector: Injector,
    rpcContextCreator: RpcContextCreator,
    exceptionFiltersContext: ExceptionFiltersContext;

  beforeAll(() => {
    metadataExplorer = new ListenerMetadataExplorer(new MetadataScanner());
    explorer = metadataExplorer;
  });
  beforeEach(() => {
    container = new NestContainer();
    graphInspector = new GraphInspector(container);
    injector = new Injector();
    exceptionFiltersContext = new ExceptionFiltersContext(
      container,
      new ApplicationConfig(),
    );
    rpcContextCreator = {
      ...Object.fromEntries(
        Object.getOwnPropertyNames(RpcContextCreator.prototype).map(m => [
          m,
          vi.fn(),
        ]),
      ),
    } as any;
    proxySpy = vi.fn();
    (rpcContextCreator as any).create.mockImplementation(() => proxySpy);

    instance = new ListenersController(
      new ClientsContainer(),
      rpcContextCreator,
      container,
      injector,
      ClientProxyFactory,
      exceptionFiltersContext,
      graphInspector,
    );
    (instance as any).metadataExplorer = metadataExplorer;
    addSpy = vi.fn();
    server = {
      addHandler: addSpy,
    };
    addSpyTCP = vi.fn();
    serverTCP = {
      addHandler: addSpyTCP,
      transportId: Transport.TCP,
    };
    addSpyCustom = vi.fn();
    customTransport = Symbol();
    serverCustom = {
      addHandler: addSpyCustom,
      transportId: customTransport,
    };
  });

  describe('registerPatternHandlers', () => {
    const handlers = [
      { patterns: ['test'], targetCallback: 'tt' },
      { patterns: ['test2'], targetCallback: '2', isEventHandler: true },
    ];

    beforeEach(() => {
      vi.spyOn(container, 'getModuleByKey').mockImplementation(
        () => ({}) as any,
      );
    });
    it(`should call "addHandler" method of server for each pattern handler`, () => {
      vi.spyOn(metadataExplorer, 'explore').mockReturnValue(handlers as any);
      instance.registerPatternHandlers(new InstanceWrapper(), server, '');
      expect(addSpy).toHaveBeenCalledTimes(2);
    });
    it(`should call "addHandler" method of server for each pattern handler with same transport`, () => {
      const serverHandlers = [
        {
          patterns: [{ cmd: 'test' }],
          targetCallback: 'tt',
          transport: Transport.TCP,
        },
        { pattern: 'test2', targetCallback: '2', transport: Transport.KAFKA },
      ];
      vi.spyOn(metadataExplorer, 'explore').mockReturnValue(
        serverHandlers as any,
      );
      instance.registerPatternHandlers(new InstanceWrapper(), serverTCP, '');
      expect(addSpyTCP).toHaveBeenCalledOnce();
    });
    it(`should call "addHandler" method of server without transportID for each pattern handler with any transport value`, () => {
      const serverHandlers = [
        { patterns: [{ cmd: 'test' }], targetCallback: 'tt' },
        {
          patterns: ['test2'],
          targetCallback: '2',
          transport: Transport.KAFKA,
        },
      ];
      vi.spyOn(metadataExplorer, 'explore').mockReturnValue(
        serverHandlers as any,
      );
      instance.registerPatternHandlers(new InstanceWrapper(), server, '');
      expect(addSpy).toHaveBeenCalledTimes(2);
    });
    it(`should call "addHandler" method of server with transportID for each pattern handler with self transport and without transport`, () => {
      const serverHandlers = [
        { patterns: ['test'], targetCallback: 'tt' },
        {
          patterns: ['test2'],
          targetCallback: '2',
          transport: Transport.KAFKA,
        },
        {
          patterns: [{ cmd: 'test3' }],
          targetCallback: '3',
          transport: Transport.TCP,
        },
      ];
      vi.spyOn(metadataExplorer, 'explore').mockReturnValue(
        serverHandlers as any,
      );
      instance.registerPatternHandlers(new InstanceWrapper(), serverTCP, '');
      expect(addSpyTCP).toHaveBeenCalledTimes(2);
    });
    it(`should call "addHandler" method of server with transportID for each pattern handler without transport`, () => {
      vi.spyOn(metadataExplorer, 'explore').mockReturnValue(handlers as any);
      instance.registerPatternHandlers(new InstanceWrapper(), serverTCP, '');
      expect(addSpyTCP).toHaveBeenCalledTimes(2);
    });
    it(`should call "addHandler" method of server with custom transportID for pattern handler with the same custom token`, () => {
      const serverHandlers = [
        {
          patterns: [{ cmd: 'test' }],
          targetCallback: 'tt',
          transport: customTransport,
        },
        {
          patterns: ['test2'],
          targetCallback: '2',
          transport: Transport.KAFKA,
        },
      ];

      vi.spyOn(metadataExplorer, 'explore').mockReturnValue(
        serverHandlers as any,
      );
      instance.registerPatternHandlers(new InstanceWrapper(), serverCustom, '');
      expect(addSpyCustom).toHaveBeenCalledOnce();
    });
    it(`should call "addHandler" method of server with extras data`, () => {
      const serverHandlers = [
        {
          patterns: ['test'],
          targetCallback: 'tt',
          extras: { param: 'value' },
        },
      ];
      vi.spyOn(metadataExplorer, 'explore').mockReturnValue(
        serverHandlers as any,
      );
      instance.registerPatternHandlers(new InstanceWrapper(), serverTCP, '');
      expect(addSpyTCP).toHaveBeenCalledOnce();
      expect(addSpyTCP.mock.calls[0][3]).toEqual(
        expect.objectContaining({ param: 'value' }),
      );
    });
    describe('when request scoped', () => {
      it(`should call "addHandler" with deferred proxy`, () => {
        vi.spyOn(metadataExplorer, 'explore').mockReturnValue(handlers as any);
        instance.registerPatternHandlers(
          new InstanceWrapper({ scope: Scope.REQUEST }),
          server,
          '',
        );
        expect(addSpy).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('createRequestScopedHandler', () => {
    let handleSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      handleSpy = vi.fn();
      vi.spyOn(exceptionFiltersContext, 'create').mockImplementation(
        () =>
          ({
            handle: handleSpy,
          }) as any,
      );

      vi.spyOn(
        (instance as any).container,
        'registerRequestProvider',
      ).mockImplementation(() => ({}) as any);
    });

    describe('when "loadPerContext" resolves', () => {
      const moduleKey = 'moduleKey';
      const methodKey = 'methodKey';
      const module = {
        controllers: new Map(),
      } as any;
      const patterns = [{}];
      const wrapper = new InstanceWrapper({ instance: { [methodKey]: {} } });

      it('should pass all arguments to the proxy chain', async () => {
        vi.spyOn(injector, 'loadPerContext').mockImplementation(() =>
          Promise.resolve({}),
        );
        const handler = instance.createRequestScopedHandler(
          wrapper,
          patterns,
          module,
          moduleKey,
          methodKey,
        );
        await handler('data', 'metadata');

        expect(proxySpy).toHaveBeenCalled();
        expect(proxySpy.mock.calls[0][0]).toEqual('data');
        expect(proxySpy.mock.calls[0][1]).toEqual('metadata');
      });
    });

    describe('when "loadPerContext" throws', () => {
      const moduleKey = 'moduleKey';
      const methodKey = 'methodKey';
      const module = {
        controllers: new Map(),
      } as any;
      const patterns = [{}];
      const wrapper = new InstanceWrapper({ instance: { [methodKey]: {} } });

      it('should delegate error to exception filters', async () => {
        vi.spyOn(injector, 'loadPerContext').mockImplementation(() => {
          throw new Error();
        });
        const handler = instance.createRequestScopedHandler(
          wrapper,
          patterns,
          module,
          moduleKey,
          methodKey,
        );
        await handler([]);

        expect(handleSpy).toHaveBeenCalled();
        expect(handleSpy.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(handleSpy.mock.calls[0][1]).toBeInstanceOf(ExecutionContextHost);
      });
    });
  });

  describe('insertEntrypointDefinition', () => {
    it('should inspect & insert corresponding entrypoint definitions', () => {
      class TestCtrl {}
      const instanceWrapper = new InstanceWrapper({
        metatype: TestCtrl,
        name: TestCtrl.name,
      });
      const definition: EventOrMessageListenerDefinition = {
        patterns: ['findOne'],
        methodKey: 'find',
        isEventHandler: false,
        targetCallback: null!,
        extras: { qos: 2 },
      };
      const transportId = Transport.MQTT;

      const insertEntrypointDefinitionSpy = vi.spyOn(
        graphInspector,
        'insertEntrypointDefinition',
      );
      instance.insertEntrypointDefinition(
        instanceWrapper,
        definition,
        transportId,
      );
      expect(insertEntrypointDefinitionSpy).toHaveBeenCalledWith(
        {
          type: 'microservice',
          methodName: definition.methodKey,
          className: 'TestCtrl',
          classNodeId: instanceWrapper.id,
          metadata: {
            key: definition.patterns.toString(),
            transportId: 'MQTT',
            patterns: definition.patterns,
            isEventHandler: definition.isEventHandler,
            extras: definition.extras,
          } as any,
        },
        expect.any(String),
      );
    });
  });

  describe('assignClientToInstance', () => {
    it('should assign client to instance', () => {
      const propertyKey = 'key';
      const object = {};
      const client = { test: true };
      instance.assignClientToInstance(object, propertyKey, client);

      expect(object[propertyKey]).toEqual(client);
    });
  });

  describe('assignClientsToProperties', () => {
    class TestClass {}

    it('should bind all clients to properties', () => {
      const controller = new TestClass();
      const metadata = [
        {
          property: 'key',
          metadata: {},
        },
      ];
      vi.spyOn(
        (instance as any).metadataExplorer,
        'scanForClientHooks',
      ).mockImplementation(() => metadata);

      const assignClientToInstanceSpy = vi.spyOn(
        instance,
        'assignClientToInstance',
      );
      instance.assignClientsToProperties(controller);

      expect(assignClientToInstanceSpy).toHaveBeenCalledOnce();
    });
  });
});
