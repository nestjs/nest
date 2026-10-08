import { Scope } from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { STATIC_CONTEXT } from '@nestjs/core/injector/constants.js';
import { NestContainer } from '@nestjs/core/injector/container.js';
import { Injector } from '@nestjs/core/injector/injector.js';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper.js';
import {
  EMPTY,
  lastValueFrom,
  map,
  Observable,
  tap,
  throwError,
  timer,
  toArray,
} from 'rxjs';
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
import { MessageHandler } from '../interfaces/message-handler.interface.js';
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
    describe('reporting unhandled errors', () => {
      const createSpy = () => vi.spyOn(rpcContextCreator, 'create');
      const reportFlagOf = (spy: any) => spy.mock.calls.map((c: any[]) => c[7]);

      beforeEach(() => {
        vi.spyOn(metadataExplorer, 'explore').mockReturnValue(handlers as any);
      });

      it('should ask for a report only for event handlers', () => {
        const spy = createSpy();

        instance.registerPatternHandlers(new InstanceWrapper(), server, '');

        // handlers[1] is the event handler; handlers[0] is a message one
        expect(reportFlagOf(spy)[1]).toBe(true);
      });

      it('should not ask for a report when the transport propagates the error', () => {
        const spy = createSpy();
        const kafkaLike = { ...server, propagatesEventHandlerErrors: true };

        instance.registerPatternHandlers(new InstanceWrapper(), kafkaLike, '');

        expect(reportFlagOf(spy)[1]).toBe(false);
      });
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
    describe('when static', () => {
      it('should create the proxy with the controller id as inquirer id', () => {
        vi.spyOn(metadataExplorer, 'explore').mockReturnValue(handlers as any);
        const controller = new InstanceWrapper();

        instance.registerPatternHandlers(controller, server, '');

        const [, , , , contextId, inquirerId] = (
          rpcContextCreator.create as any
        ).mock.calls[0];
        expect(contextId).toBe(STATIC_CONTEXT);
        expect(inquirerId).toBe(controller.id);
      });
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

  describe('forkJoinHandlersIfAttached', () => {
    let sideEffects: string[];

    beforeEach(() => {
      sideEffects = [];
    });

    // Resolves after a tick, like a handler that awaits I/O, and records a
    // side effect that only happens if nobody cancels the subscription.
    const slowHandlerResult = (name: string) =>
      timer(10).pipe(
        tap(() => sideEffects.push(name)),
        map(() => name),
      );

    const createHandlerChain = ([
      returnValue,
      ...rest
    ]: Observable<unknown>[]): MessageHandler => {
      const handler: MessageHandler = async (...args: unknown[]) =>
        instance.forkJoinHandlersIfAttached(returnValue, args, handler);
      if (rest.length > 0) {
        handler.next = createHandlerChain(rest);
      }
      return handler;
    };

    const emissionsOf = async (handler: MessageHandler) =>
      lastValueFrom(
        instance.transformToObservable(await handler('data')).pipe(toArray()),
      );

    it('should return the value untouched when there is no next handler', () => {
      const returnValue = slowHandlerResult('a');
      const lastHandler = createHandlerChain([returnValue]);

      expect(
        instance.forkJoinHandlersIfAttached(returnValue, [], lastHandler),
      ).toBe(returnValue);
    });

    it('should run the next handler when the current one completes empty', async () => {
      const emissions = await emissionsOf(
        createHandlerChain([EMPTY, slowHandlerResult('next')]),
      );

      expect(sideEffects).toEqual(['next']);
      expect(emissions).toHaveLength(1);
    });

    it('should run the current handler when the next one completes empty', async () => {
      const emissions = await emissionsOf(
        createHandlerChain([slowHandlerResult('current'), EMPTY]),
      );

      expect(sideEffects).toEqual(['current']);
      expect(emissions).toHaveLength(1);
    });

    it('should run every handler when the middle one of three completes empty', async () => {
      const emissions = await emissionsOf(
        createHandlerChain([
          slowHandlerResult('first'),
          EMPTY,
          slowHandlerResult('last'),
        ]),
      );

      expect([...sideEffects].sort()).toEqual(['first', 'last']);
      expect(emissions).toHaveLength(1);
    });

    it('should run every handler when the last one of three completes empty', async () => {
      const emissions = await emissionsOf(
        createHandlerChain([
          slowHandlerResult('first'),
          slowHandlerResult('second'),
          EMPTY,
        ]),
      );

      expect([...sideEffects].sort()).toEqual(['first', 'second']);
      expect(emissions).toHaveLength(1);
    });

    it('should still fail the join when one handler errors', async () => {
      const failure = new Error('handler failed');

      await expect(
        emissionsOf(
          createHandlerChain([
            slowHandlerResult('current'),
            throwError(() => failure),
          ]),
        ),
      ).rejects.toBe(failure);
    });

    it('should run the next static handler when the current one completes empty', async () => {
      vi.spyOn(container, 'getModuleByKey').mockReturnValue({} as any);
      vi.spyOn(metadataExplorer, 'explore').mockReturnValue([
        { patterns: ['event'], targetCallback: 'a', isEventHandler: true },
        { patterns: ['event'], targetCallback: 'b', isEventHandler: true },
      ] as any);
      proxySpy
        .mockReturnValueOnce(EMPTY)
        .mockReturnValueOnce(slowHandlerResult('next'));

      instance.registerPatternHandlers(
        new InstanceWrapper({ instance: {} }),
        server,
        '',
      );
      const [[, head], [, tail]] = addSpy.mock.calls;
      head.next = tail;
      const emissions = await emissionsOf(head);

      expect(sideEffects).toEqual(['next']);
      expect(emissions).toHaveLength(1);
    });

    it('should run the next request-scoped handler when the current one completes empty', async () => {
      vi.spyOn(container, 'registerRequestProvider').mockImplementation(
        () => ({}) as any,
      );
      vi.spyOn(injector, 'loadPerContext').mockResolvedValue({
        handle: () => undefined,
      });
      proxySpy
        .mockReturnValueOnce(EMPTY)
        .mockReturnValueOnce(slowHandlerResult('next'));
      const createHandler = () =>
        instance.createRequestScopedHandler(
          new InstanceWrapper({ instance: {} }),
          {},
          { controllers: new Map() } as any,
          'moduleKey',
          'handle',
          undefined,
          true,
        );
      const head = createHandler();
      head.next = createHandler();

      const emissions = await emissionsOf(head);

      expect(sideEffects).toEqual(['next']);
      expect(emissions).toHaveLength(1);
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
