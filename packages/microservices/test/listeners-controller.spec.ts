import { Scope } from '@nestjs/common';
import { ApplicationConfig } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { NestContainer } from '@nestjs/core/injector/container';
import { Injector } from '@nestjs/core/injector/injector';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { MetadataScanner } from '../../core/metadata-scanner';
import { ClientProxyFactory } from '../client';
import { ClientsContainer } from '../container';
import { ExceptionFiltersContext } from '../context/exception-filters-context';
import { RpcContextCreator } from '../context/rpc-context-creator';
import { Transport } from '../enums/transport.enum';
import { ListenerMetadataExplorer } from '../listener-metadata-explorer';
import { ListenersController } from '../listeners-controller';

describe('ListenersController', () => {
  let instance: ListenersController,
    explorer: sinon.SinonMock,
    metadataExplorer: ListenerMetadataExplorer,
    server: any,
    serverTCP: any,
    addSpy: sinon.SinonSpy,
    addSpyTCP: sinon.SinonSpy,
    proxySpy: sinon.SinonSpy,
    container: NestContainer,
    injector: Injector,
    rpcContextCreator: RpcContextCreator,
    exceptionFiltersContext: ExceptionFiltersContext;

  before(() => {
    metadataExplorer = new ListenerMetadataExplorer(new MetadataScanner());
    explorer = sinon.mock(metadataExplorer);
  });
  beforeEach(() => {
    container = new NestContainer();
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
  });

  describe('registerPatternHandlers', () => {
    const handlers = [
      { pattern: 'test', targetCallback: 'tt' },
      { pattern: 'test2', targetCallback: '2', isEventHandler: true },
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
          pattern: { cmd: 'test' },
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
        { pattern: { cmd: 'test' }, targetCallback: 'tt' },
        { pattern: 'test2', targetCallback: '2', transport: Transport.KAFKA },
      ];
      explorer.expects('explore').returns(serverHandlers);
      instance.registerPatternHandlers(new InstanceWrapper(), server, '');
      expect(addSpy.calledTwice).to.be.true;
    });
    it(`should call "addHandler" method of server with transportID for each pattern handler with self transport and without transport`, () => {
      const serverHandlers = [
        { pattern: 'test', targetCallback: 'tt' },
        { pattern: 'test2', targetCallback: '2', transport: Transport.KAFKA },
        {
          pattern: { cmd: 'test3' },
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
    describe('when request scoped', () => {
      it(`should call "addHandler" with deffered proxy`, () => {
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
      const pattern = {};
      const wrapper = new InstanceWrapper({ instance: { [methodKey]: {} } });

      it('should pass all arguments to the proxy chain', async () => {
        sinon
          .stub(injector, 'loadPerContext')
          .callsFake(() => Promise.resolve({}));
        const handler = instance.createRequestScopedHandler(
          wrapper,
          pattern,
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
      const pattern = {};
      const wrapper = new InstanceWrapper({ instance: { [methodKey]: {} } });

      it('should delegete error to exception filters', async () => {
        sinon.stub(injector, 'loadPerContext').callsFake(() => {
          throw new Error();
        });
        const handler = instance.createRequestScopedHandler(
          wrapper,
          pattern,
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

  describe('assignClientToInstance', () => {
    it('should assing client to instance', () => {
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
