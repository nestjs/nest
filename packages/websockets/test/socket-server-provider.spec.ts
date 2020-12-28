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
    const namespace = 'test';
    const port = 30;

    beforeEach(() => {
      createSocketServerSpy = sinon.spy(instance, 'createSocketServer' as any);
    });
    afterEach(() => {
      mockContainer.restore();
    });
    it(`should return stored server`, () => {
      const server = { test: 'test' };
      mockContainer.expects('getSocketEventsHostByPort').returns(server);

      const result = instance.scanForSocketServer({ namespace: null }, port);

      expect(createSocketServerSpy.called).to.be.false;
      expect(result).to.eq(server);
    });
    it(`should call "createSocketServer" when server is not stored already`, () => {
      mockContainer.expects('getSocketEventsHostByPort').returns(null);

      instance.scanForSocketServer({ namespace }, port);
      expect(createSocketServerSpy.called).to.be.true;
    });
  });
});
