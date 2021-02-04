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

  beforeEach(() => {
    socketsContainer = new SocketsContainer();
    mockContainer = sinon.mock(socketsContainer);
    instance = new SocketServerProvider(
      socketsContainer,
      new ApplicationConfig(new NoopAdapter()),
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

      const result = instance.scanForSocketServer({ namespace: null }, port);

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
        mockContainer.expects('getOneByConfig').returns(server);

        const decorateWithNamespaceSpy = sinon.spy(
          instance,
          'decorateWithNamespace' as any,
        );

        instance.scanForSocketServer({ path, namespace: 'random' }, port);
        expect(decorateWithNamespaceSpy.called).to.be.true;
        expect(createSocketServerSpy.called).to.be.false;
      });
    });
  });
});
