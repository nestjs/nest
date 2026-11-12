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

      for (const [description, isNamespacedFirst] of [
        ['declared first', true],
        ['declared second', false],
      ] as const) {
        it(`should share the streams of the gateways without a namespace with a gateway on "/" ${description}`, () => {
          const scanRoot = () => instance.scanForSocketServer({ path }, port);
          const scanSlash = () =>
            instance.scanForSocketServer({ path, namespace: '/' }, port);
          const [slashHost, rootHost] = isNamespacedFirst
            ? [scanSlash(), scanRoot()]
            : [scanRoot(), scanSlash()].reverse();

          expect(slashHost).not.to.equal(rootHost);
          expect(slashHost.connection).to.equal(rootHost.connection);
          expect(slashHost.disconnect).to.equal(rootHost.disconnect);
        });
      }

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

    describe('when a gateway joins a server created for another one', () => {
      let logError: sinon.SinonStub;
      let logWarn: sinon.SinonStub;
      beforeEach(() => {
        logError = sinon.stub(instance['logger'], 'error');
        logWarn = sinon.stub(instance['logger'], 'warn');
      });

      for (const key of ['verifyClient', 'allowRequest']) {
        it(`should refuse a gateway whose "${key}" the server would not run`, () => {
          instance.scanForSocketServer({ path }, port, 'OpenGateway');

          expect(() =>
            instance.scanForSocketServer(
              { path, [key]: () => false },
              port,
              'CheckedGateway',
            ),
          ).to.throw(
            `The gateway CheckedGateway sets "${key}", but shares the server on port ${port} and the path "${path}" with a gateway declared before it, and the server runs no "${key}" of that gateway.`,
          );
          expect(logError.calledOnce).to.be.true;
        });
      }

      it('should refuse a gateway on a namespace with another "allowRequest"', () => {
        instance.scanForSocketServer(
          { path, namespace: 'a', allowRequest: () => true },
          port,
        );

        expect(() =>
          instance.scanForSocketServer(
            { path, namespace: 'b', allowRequest: () => false },
            port,
          ),
        ).to.throw(/runs the "allowRequest" of that gateway/);
      });

      it('should accept a gateway with the same connection check, or none', () => {
        const verifyClient = () => true;
        instance.scanForSocketServer({ path, verifyClient }, port);

        instance.scanForSocketServer({ path, verifyClient }, port);
        instance.scanForSocketServer({ path }, port);

        expect(logError.called).to.be.false;
        expect(logWarn.called).to.be.false;
      });

      it('should report other options the gateway would lose', () => {
        instance.scanForSocketServer(
          { path, namespace: 'a', cors: { origin: '*' } },
          port,
        );

        instance.scanForSocketServer(
          { path, namespace: 'b', cors: { origin: '*' } },
          port,
        );
        expect(logWarn.called).to.be.false;

        instance.scanForSocketServer(
          { path, namespace: 'c', cors: { origin: 'x' }, transports: [] },
          port,
          'ChatGateway',
        );
        expect(logWarn.calledOnce).to.be.true;
        expect(logWarn.firstCall.args[0]).to.match(
          /^The gateway ChatGateway shares .* not applied: "cors", "transports"\.$/,
        );
      });
    });
  });
});
