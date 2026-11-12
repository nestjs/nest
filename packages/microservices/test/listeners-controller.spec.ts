import { Scope } from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { STATIC_CONTEXT } from '@nestjs/core/injector/constants';
import { NestContainer } from '@nestjs/core/injector/container';
import { Injector } from '@nestjs/core/injector/injector';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { expect } from 'chai';
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
import * as sinon from 'sinon';
import { GraphInspector } from '../../core/inspector/graph-inspector';
import { MetadataScanner } from '../../core/metadata-scanner';
import { ClientProxyFactory } from '../client';
import { ClientsContainer } from '../container';
import { ExceptionFiltersContext } from '../context/exception-filters-context';
import { RpcContextCreator } from '../context/rpc-context-creator';
import { RpcProxy } from '../context/rpc-proxy';
import { Transport } from '../enums/transport.enum';
import { BaseRpcExceptionFilter } from '../exceptions/base-rpc-exception-filter';
import { KafkaRetriableException } from '../exceptions/kafka-retriable-exception';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';
import {
  EventOrMessageListenerDefinition,
  ListenerMetadataExplorer,
} from '../listener-metadata-explorer';
import { MessageHandler } from '../interfaces/message-handler.interface';
import { ListenersController } from '../listeners-controller';

describe('ListenersController', () => {
  let instance: ListenersController,
    explorer: sinon.SinonMock,
    metadataExplorer: ListenerMetadataExplorer,
    server: any,
    serverTCP: any,
    serverCustom: any,
    customTransport: symbol,
    addSpy: sinon.SinonSpy,
    addSpyTCP: sinon.SinonSpy,
    addSpyCustom: sinon.SinonSpy,
    proxySpy: sinon.SinonSpy,
    container: NestContainer,
    graphInspector: GraphInspector,
    injector: Injector,
    rpcContextCreator: RpcContextCreator,
    exceptionFiltersContext: ExceptionFiltersContext;

  before(() => {
    metadataExplorer = new ListenerMetadataExplorer(new MetadataScanner());
    explorer = sinon.mock(metadataExplorer);
  });
  beforeEach(() => {
    container = new NestContainer();
    graphInspector = new GraphInspector(container);
    injector = new Injector();
    exceptionFiltersContext = new ExceptionFiltersContext(
      container,
      new ApplicationConfig(),
    );
    rpcContextCreator = sinon.createStubInstance(RpcContextCreator) as any;
    proxySpy = sinon.spy();
    (rpcContextCreator as any).create.callsFake(() => proxySpy);

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
    addSpy = sinon.spy();
    server = {
      addHandler: addSpy,
    };
    addSpyTCP = sinon.spy();
    serverTCP = {
      addHandler: addSpyTCP,
      transportId: Transport.TCP,
    };
    addSpyCustom = sinon.spy();
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
      sinon.stub(container, 'getModuleByKey').callsFake(() => ({}) as any);
    });
    it(`should call "addHandler" method of server for each pattern handler`, () => {
      explorer.expects('explore').returns(handlers);
      instance.registerPatternHandlers(new InstanceWrapper(), server, '');
      expect(addSpy.calledTwice).to.be.true;
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
      explorer.expects('explore').returns(serverHandlers);
      instance.registerPatternHandlers(new InstanceWrapper(), serverTCP, '');
      expect(addSpyTCP.calledOnce).to.be.true;
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
      explorer.expects('explore').returns(serverHandlers);
      instance.registerPatternHandlers(new InstanceWrapper(), server, '');
      expect(addSpy.calledTwice).to.be.true;
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
      explorer.expects('explore').returns(serverHandlers);
      instance.registerPatternHandlers(new InstanceWrapper(), serverTCP, '');
      expect(addSpyTCP.calledTwice).to.be.true;
    });
    it(`should call "addHandler" method of server with transportID for each pattern handler without transport`, () => {
      explorer.expects('explore').returns(handlers);
      instance.registerPatternHandlers(new InstanceWrapper(), serverTCP, '');
      expect(addSpyTCP.calledTwice).to.be.true;
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

      explorer.expects('explore').returns(serverHandlers);
      instance.registerPatternHandlers(new InstanceWrapper(), serverCustom, '');
      expect(addSpyCustom.calledOnce).to.be.true;
    });
    it(`should call "addHandler" method of server with extras data`, () => {
      const serverHandlers = [
        {
          patterns: ['test'],
          targetCallback: 'tt',
          extras: { param: 'value' },
        },
      ];
      explorer.expects('explore').returns(serverHandlers);
      instance.registerPatternHandlers(new InstanceWrapper(), serverTCP, '');
      expect(addSpyTCP.calledOnce).to.be.true;
      expect(
        addSpyTCP.calledWith(
          sinon.match.any,
          sinon.match.any,
          sinon.match.any,
          sinon.match({ param: 'value' }),
        ),
      ).to.be.true;
    });
    describe('when static', () => {
      it('should create the proxy with the controller id as inquirer id', () => {
        explorer.expects('explore').returns(handlers);
        const controller = new InstanceWrapper();

        instance.registerPatternHandlers(controller, server, '');

        const [, , , , contextId, inquirerId] = (
          rpcContextCreator.create as sinon.SinonStub
        ).firstCall.args;
        expect(contextId).to.equal(STATIC_CONTEXT);
        expect(inquirerId).to.equal(controller.id);
      });
    });
    describe('when request scoped', () => {
      it(`should call "addHandler" with deferred proxy`, () => {
        explorer.expects('explore').returns(handlers);
        instance.registerPatternHandlers(
          new InstanceWrapper({ scope: Scope.REQUEST }),
          server,
          '',
        );
        expect(addSpy.calledTwice).to.be.true;
      });
    });
  });

  describe('createRequestScopedHandler', () => {
    let handleSpy: sinon.SinonSpy;

    beforeEach(() => {
      handleSpy = sinon.spy();
      sinon.stub(exceptionFiltersContext, 'create').callsFake(
        () =>
          ({
            handle: handleSpy,
          }) as any,
      );

      sinon
        .stub((instance as any).container, 'registerRequestProvider')
        .callsFake(() => ({}) as any);
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
        sinon
          .stub(injector, 'loadPerContext')
          .callsFake(() => Promise.resolve({}));
        const handler = instance.createRequestScopedHandler(
          wrapper,
          patterns,
          module,
          moduleKey,
          methodKey,
        );
        await handler('data', 'metadata');

        expect(proxySpy.called).to.be.true;
        expect(proxySpy.getCall(0).args[0]).to.be.eql('data');
        expect(proxySpy.getCall(0).args[1]).to.be.eql('metadata');
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

      const createScopedWrapper = () => {
        const filter = new InstanceWrapper({ subtype: 'filter' } as any);
        const guard = new InstanceWrapper({ subtype: 'guard' } as any);
        const scopedWrapper = new InstanceWrapper({
          instance: { [methodKey]: {} },
        });
        sinon
          .stub(scopedWrapper, 'getEnhancersMetadata')
          .returns([filter, guard]);
        return { scopedWrapper, filter };
      };

      it('should create the filters for the context of the message', async () => {
        const error = new Error('provider failed');
        sinon.stub(injector, 'loadPerContext').rejects(error);
        const loadInjectable = sinon
          .stub(injector, 'loadInjectable')
          .resolves();
        const { scopedWrapper, filter } = createScopedWrapper();
        const handler = instance.createRequestScopedHandler(
          scopedWrapper,
          patterns,
          module,
          moduleKey,
          methodKey,
        );

        await handler('data');

        // Only the filters: a guard may need what failed to resolve
        expect(loadInjectable.calledOnce).to.be.true;
        const [enhancer, , contextId, inquirer] =
          loadInjectable.getCall(0).args;
        expect(enhancer).to.equal(filter);
        expect(inquirer).to.equal(scopedWrapper);
        expect(
          (exceptionFiltersContext.create as sinon.SinonStub).calledWith(
            scopedWrapper.instance,
            scopedWrapper.instance[methodKey],
            moduleKey,
            contextId,
            scopedWrapper.id,
          ),
        ).to.be.true;
        expect(handleSpy.calledOnce).to.be.true;
        expect(handleSpy.getCall(0).args[0]).to.equal(error);
      });

      it('should fall back to the static filters when the filters fail to resolve', async () => {
        const error = new Error('provider failed');
        sinon.stub(injector, 'loadPerContext').rejects(error);
        sinon
          .stub(injector, 'loadInjectable')
          .rejects(new Error('filter failed'));
        const { scopedWrapper } = createScopedWrapper();
        const handler = instance.createRequestScopedHandler(
          scopedWrapper,
          patterns,
          module,
          moduleKey,
          methodKey,
        );

        await handler('data');

        const create = exceptionFiltersContext.create as sinon.SinonStub;
        expect(create.calledOnce).to.be.true;
        expect(create.getCall(0).args).to.deep.equal([
          scopedWrapper.instance,
          scopedWrapper.instance[methodKey],
          moduleKey,
        ]);
        expect(handleSpy.calledOnce).to.be.true;
        expect(handleSpy.getCall(0).args[0]).to.equal(error);
      });

      it('should delegate error to exception filters', async () => {
        sinon.stub(injector, 'loadPerContext').callsFake(() => {
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

        expect(handleSpy.called).to.be.true;
        expect(handleSpy.getCall(0).args[0]).to.be.instanceOf(Error);
        expect(handleSpy.getCall(0).args[1]).to.be.instanceOf(
          ExecutionContextHost,
        );
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

    const rejectionOf = async (promise: Promise<unknown>) => {
      try {
        await promise;
      } catch (err) {
        return err;
      }
      throw new Error('Expected the promise to reject');
    };

    it('should return the value untouched when there is no next handler', () => {
      const returnValue = slowHandlerResult('a');
      const lastHandler = createHandlerChain([returnValue]);

      expect(
        instance.forkJoinHandlersIfAttached(returnValue, [], lastHandler),
      ).to.equal(returnValue);
    });

    it('should run the next handler when the current one completes empty', async () => {
      const emissions = await emissionsOf(
        createHandlerChain([EMPTY, slowHandlerResult('next')]),
      );

      expect(sideEffects).to.deep.equal(['next']);
      expect(emissions).to.have.length(1);
    });

    it('should still fail the join when one handler errors', async () => {
      const failure = new Error('handler failed');

      const error = await rejectionOf(
        emissionsOf(
          createHandlerChain([
            slowHandlerResult('current'),
            throwError(() => failure),
          ]),
        ),
      );
      expect(error).to.equal(failure);
      expect(sideEffects).to.deep.equal(['current']);
    });

    it('should run the next handlers when the current one errors', async () => {
      const failure = new Error('handler failed');

      const error = await rejectionOf(
        emissionsOf(
          createHandlerChain([
            throwError(() => failure),
            slowHandlerResult('second'),
            slowHandlerResult('third'),
          ]),
        ),
      );
      expect(error).to.equal(failure);
      expect([...sideEffects].sort()).to.deep.equal(['second', 'third']);
    });

    describe('when the exception filter of a handler fails', () => {
      const filterError = new Error('filter failed');
      let unhandledRejection: sinon.SinonSpy;
      let loggerErrorStub: sinon.SinonStub;

      beforeEach(() => {
        unhandledRejection = sinon.spy();
        process.on('unhandledRejection', unhandledRejection);
        loggerErrorStub = sinon.stub(
          (BaseRpcExceptionFilter as any).logger,
          'error',
        );
      });
      afterEach(() => {
        process.off('unhandledRejection', unhandledRejection);
        loggerErrorStub.restore();
      });

      const flush = () => new Promise(resolve => setImmediate(resolve));
      // Proxies as the context creator builds them, whose handler fails and
      // whose filter fails in turn
      const createFailingProxy = (filter: () => unknown) => {
        const exceptionsHandler = new RpcExceptionsHandler();
        exceptionsHandler.setCustomFilters([
          { exceptionMetatypes: [], func: filter as any },
        ]);
        return new RpcProxy().create(async () => {
          throw new Error('handler failed');
        }, exceptionsHandler);
      };
      const createProxyChain = (
        proxies: Array<(...args: unknown[]) => Promise<unknown>>,
      ): MessageHandler => {
        const [proxy, ...rest] = proxies;
        const handler: MessageHandler = async (...args: unknown[]) =>
          instance.forkJoinHandlersIfAttached(
            proxy(...args) as Promise<unknown>,
            args,
            handler,
          );
        if (rest.length > 0) {
          handler.next = createProxyChain(rest);
        }
        return handler;
      };
      const succeeding = () =>
        new RpcProxy().create(
          async () => 'done' as any,
          new RpcExceptionsHandler(),
        );

      (
        [
          [
            'throws',
            () => {
              throw filterError;
            },
          ],
          [
            'rejects',
            async () => {
              throw filterError;
            },
          ],
        ] as const
      ).forEach(([description, filter]) => {
        it(`should not leave the rejection unhandled when the filter ${description} and the join is never subscribed`, async () => {
          // ServerTCP does not subscribe to it for a peer that is gone
          await createProxyChain([createFailingProxy(filter), succeeding()])(
            'data',
          );
          await flush();
          await createProxyChain([succeeding(), createFailingProxy(filter)])(
            'data',
          );
          await flush();

          expect(unhandledRejection.called).to.be.false;
          expect(loggerErrorStub.callCount).to.equal(2);
          expect(loggerErrorStub.calledWith(filterError)).to.be.true;
        });
      });

      it('should answer the join as an unknown error', async () => {
        const join = await createProxyChain([
          createFailingProxy(() => {
            throw filterError;
          }),
          succeeding(),
        ])('data');

        expect(
          await rejectionOf(
            lastValueFrom(instance.transformToObservable(join)),
          ),
        ).to.deep.equal({
          status: 'error',
          message: 'Internal server error',
        });
      });

      it('should pass on an exception that returns itself from "getError"', async () => {
        const retriable = new KafkaRetriableException('retry me');
        const join = await createProxyChain([
          succeeding(),
          createFailingProxy(() => {
            throw retriable;
          }),
        ])('data');

        expect(
          await rejectionOf(
            lastValueFrom(instance.transformToObservable(join)),
          ),
        ).to.equal(retriable);
        expect(loggerErrorStub.called).to.be.false;
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

      const insertEntrypointDefinitionSpy = sinon.spy(
        graphInspector,
        'insertEntrypointDefinition',
      );
      instance.insertEntrypointDefinition(
        instanceWrapper,
        definition,
        transportId,
      );
      expect(
        insertEntrypointDefinitionSpy.calledWith({
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
        }),
      ).to.be.true;
    });
  });

  describe('assignClientToInstance', () => {
    it('should assign client to instance', () => {
      const propertyKey = 'key';
      const object = {};
      const client = { test: true };
      instance.assignClientToInstance(object, propertyKey, client);

      expect(object[propertyKey]).to.be.eql(client);
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
      sinon
        .stub((instance as any).metadataExplorer, 'scanForClientHooks')
        .callsFake(() => metadata);

      const assignClientToInstanceSpy = sinon.spy(
        instance,
        'assignClientToInstance',
      );
      instance.assignClientsToProperties(controller);

      expect(assignClientToInstanceSpy.calledOnce).to.be.true;
    });
  });
});
