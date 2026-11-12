import { ApplicationConfig } from '@nestjs/core/application-config';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { AbstractWsAdapter } from '../adapters/ws-adapter';
import { SocketServerProvider } from '../socket-server-provider';
import { SocketsContainer } from '../sockets-container';

class NoopAdapter extends AbstractWsAdapter {
  public create(port: number, options?: any) {}
  public bindMessageHandlers(client: any, handlers) {}
}

describe('SocketServerProvider', () => {
  let instance: SocketServerProvider;
  let socketsContainer: SocketsContainer, mockContainer: sinon.SinonMock;
  let adapter: NoopAdapter;

  beforeEach(() => {
    socketsContainer = new SocketsContainer();
    mockContainer = sinon.mock(socketsContainer);
    adapter = new NoopAdapter();
    instance = new SocketServerProvider(
      socketsContainer,
      new ApplicationConfig(adapter),
    );
  });
  describe('scanForSocketServer', () => {
    let createSocketServerSpy: sinon.SinonSpy;
    const path = 'localhost:3030';
    const port = 30;

    beforeEach(() => {
      createSocketServerSpy = sinon.spy(instance, 'createSocketServer' as any);
    });

    afterEach(() => {
      mockContainer.restore();
    });
    it(`should return stored server`, () => {
      const server = { test: 'test' };
      mockContainer.expects('getOneByConfig').returns(server);

      const result = instance.scanForSocketServer({ namespace: null! }, port);

      expect(createSocketServerSpy.called).to.be.false;
      expect(result).to.eq(server);
    });

    it(`should call "createSocketServer" when server is not stored already`, () => {
      mockContainer.expects('getOneByConfig').returns(null);

      instance.scanForSocketServer({ path }, port);
      expect(createSocketServerSpy.called).to.be.true;
    });

    it(`should call "decorateWithNamespace" when namespace is specified`, () => {
      const decorateWithNamespaceSpy = sinon.spy(
        instance,
        'decorateWithNamespace' as any,
      );

      instance.scanForSocketServer({ path, namespace: 'random' }, port);
      expect(decorateWithNamespaceSpy.called).to.be.true;
    });

    describe('when namespace is specified and server does exist already', () => {
      it(`should call "decorateWithNamespace" and not call "createSocketServer"`, () => {
        const server = { test: 'test' };
        mockContainer.expects('getOneByConfig').atLeast(1).returns(server);

        const decorateWithNamespaceSpy = sinon.spy(
          instance,
          'decorateWithNamespace' as any,
        );

        instance.scanForSocketServer({ path, namespace: 'random' }, port);
        expect(decorateWithNamespaceSpy.called).to.be.true;
        expect(createSocketServerSpy.called).to.be.false;
      });
    });

    describe('when gateways are declared on the same namespace', () => {
      it(`should return the host stored for that namespace`, () => {
        const host = instance.scanForSocketServer(
          { path, namespace: 'random' },
          port,
        );

        expect(
          instance.scanForSocketServer({ path, namespace: 'random' }, port),
        ).to.equal(host);
        expect(
          instance.scanForSocketServer({ path, namespace: '/random' }, port),
        ).to.equal(host);
        expect(createSocketServerSpy.calledOnce).to.be.true;
      });

      it(`should create the server of a RegExp namespace once`, () => {
        const host = instance.scanForSocketServer(
          { path, namespace: /^\/random-\d+$/ },
          port,
        );
        const create = sinon.spy(adapter, 'create');

        expect(
          instance.scanForSocketServer(
            { path, namespace: /^\/random-\d+$/ },
            port,
          ),
        ).to.equal(host);
        expect(create.called).to.be.false;
      });

      it(`should not return the host of another namespace, path or port`, () => {
        const host = instance.scanForSocketServer(
          { path, namespace: 'random' },
          port,
        );

        expect(instance.scanForSocketServer({ path }, port)).not.to.equal(host);
        expect(
          instance.scanForSocketServer({ path, namespace: 'other' }, port),
        ).not.to.equal(host);
        expect(
          instance.scanForSocketServer({ path, namespace: /^\/random$/ }, port),
        ).not.to.equal(host);
        expect(
          instance.scanForSocketServer(
            { path: 'localhost:3031', namespace: 'random' },
            port,
          ),
        ).not.to.equal(host);
        expect(
          instance.scanForSocketServer({ path, namespace: 'random' }, port + 1),
        ).not.to.equal(host);
      });
    });
  });
});
