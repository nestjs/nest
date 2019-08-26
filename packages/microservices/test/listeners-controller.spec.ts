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
import { ListenerMetadataExplorer } from '../listener-metadata-explorer';
import { ListenersController } from '../listeners-controller';

describe('ListenersController', () => {
  let instance: ListenersController,
    explorer: sinon.SinonMock,
    metadataExplorer: ListenerMetadataExplorer,
    server: any,
    addSpy: sinon.SinonSpy,
    container: NestContainer,
    injector: Injector,
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
    instance = new ListenersController(
      new ClientsContainer(),
      sinon.createStubInstance(RpcContextCreator) as any,
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
  });

  describe('bindPatternHandlers', () => {
    const handlers = [
      { pattern: 'test', targetCallback: 'tt' },
      { pattern: 'test2', targetCallback: '2' },
    ];

    beforeEach(() => {
      sinon.stub(container, 'getModuleByKey').callsFake(() => ({} as any));
    });
    it(`should call "addHandler" method of server for each pattern handler`, () => {
      explorer.expects('explore').returns(handlers);
      instance.bindPatternHandlers(new InstanceWrapper(), server, '');
      expect(addSpy.calledTwice).to.be.true;
    });
    describe('when request scoped', () => {
      it(`should call "addHandler" with deffered proxy`, () => {
        explorer.expects('explore').returns(handlers);
        instance.bindPatternHandlers(
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
      sinon.stub(injector, 'loadPerContext').callsFake(() => {
        throw new Error();
      });
      handleSpy = sinon.spy();
      sinon.stub(exceptionFiltersContext, 'create').callsFake(
        () =>
          ({
            handle: handleSpy,
          } as any),
      );
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

  describe('bindClientsToProperties', () => {
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

      instance.bindClientsToProperties(controller);

      expect(assignClientToInstanceSpy.calledOnce).to.be.true;
    });
  });
});
