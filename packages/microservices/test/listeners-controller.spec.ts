import { Scope } from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { NestContainer } from '@nestjs/core/injector/container';
import { Injector } from '@nestjs/core/injector/injector';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { GraphInspector } from '../../core/inspector/graph-inspector';
import { MetadataScanner } from '../../core/metadata-scanner';
import { ClientProxyFactory } from '../client';
import { ClientsContainer } from '../container';
import { ExceptionFiltersContext } from '../context/exception-filters-context';
import { RpcContextCreator } from '../context/rpc-context-creator';
import { Transport } from '../enums/transport.enum';
import {
  EventOrMessageListenerDefinition,
  ListenerMetadataExplorer,
} from '../listener-metadata-explorer';
import { ListenersController } from '../listeners-controller';

describe('ListenersController', () => {
  let instance: ListenersController,
    explorer: sinon.SinonMock,
    metadataExplorer: ListenerMetadataExplorer,
    server: any,
    serverTCP: any,
    serverCustom: any,
    customTransport: Symbol,
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
      sinon.stub(container, 'getModuleByKey').callsFake(() => ({} as any));
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
          } as any),
      );

      sinon
        .stub((instance as any).container, 'registerRequestProvider')
        .callsFake(() => ({} as any));
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
        targetCallback: null,
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
