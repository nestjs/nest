import { expect } from 'chai';
import { JSONCodec } from 'nats';
import * as sinon from 'sinon';
import { ClientNats } from '../../client/client-nats';

describe('ClientNats', () => {
  const client = new ClientNats({});

  describe('publish', () => {
    const pattern = 'test';
    const msg = { pattern, data: 'data' };
    const id = 3;

    let subscribeSpy: sinon.SinonSpy,
      publishSpy: sinon.SinonSpy,
      removeListenerSpy: sinon.SinonSpy,
      unsubscribeSpy: sinon.SinonSpy,
      connectSpy: sinon.SinonStub,
      natsClient: any,
      subscription: any,
      createClient: sinon.SinonStub;

    beforeEach(() => {
      unsubscribeSpy = sinon.spy();
      subscription = {
        unsubscribe: unsubscribeSpy,
      };
      subscribeSpy = sinon.spy(() => subscription);
      publishSpy = sinon.spy();
      removeListenerSpy = sinon.spy();

      natsClient = {
        subscribe: subscribeSpy,
        removeListener: removeListenerSpy,
        addListener: () => ({}),
        publish: publishSpy,
      };
      (client as any).natsClient = natsClient;

      connectSpy = sinon.stub(client, 'connect').callsFake(async () => {
        (client as any).natsClient = natsClient;
      });
      createClient = sinon
        .stub(client, 'createClient')
        .callsFake(() => client as any);
    });
    afterEach(() => {
      connectSpy.restore();
      createClient.restore();
    });
    it('should publish stringified message to pattern name', () => {
      client['publish'](msg, () => {});
      expect(publishSpy.getCall(0).args[0]).to.be.eql(pattern);
    });
    describe('on error', () => {
      let assignPacketIdStub: sinon.SinonStub;
      beforeEach(() => {
        assignPacketIdStub = sinon
          .stub(client, 'assignPacketId' as any)
          .callsFake(() => {
            throw new Error();
          });
      });
      afterEach(() => {
        assignPacketIdStub.restore();
      });

      it('should call callback', () => {
        const callback = sinon.spy();
        client['publish'](msg, callback);

        expect(callback.called).to.be.true;
        expect(callback.getCall(0).args[0].err).to.be.instanceof(Error);
      });
    });
    describe('dispose callback', () => {
      let assignStub: sinon.SinonStub;
      let callback: sinon.SinonSpy, subscription;

      beforeEach(async () => {
        callback = sinon.spy();
        assignStub = sinon
          .stub(client, 'assignPacketId' as any)
          .callsFake(packet => Object.assign(packet, { id }));

        subscription = client['publish'](msg, callback);
        subscription();
      });
      afterEach(() => {
        assignStub.restore();
      });

      it('should unsubscribe', () => {
        expect(unsubscribeSpy.called).to.be.true;
      });
    });
  });
  describe('createSubscriptionHandler', () => {
    const pattern = 'test';
    const msg = { pattern, data: 'data', id: '1' };
    const responseMessage = {
      response: 'test',
      id: '1',
    };
    const natsMessage = {
      data: JSONCodec().encode(responseMessage),
    };

    let callback: sinon.SinonSpy, subscription;

    describe('not completed', () => {
      beforeEach(async () => {
        callback = sinon.spy();

        subscription = client.createSubscriptionHandler(msg, callback);
        subscription(undefined, natsMessage);
      });
      it('should call callback with expected arguments', () => {
        expect(
          callback.calledWith({
            err: undefined,
            response: responseMessage.response,
          }),
        ).to.be.true;
      });
    });
    describe('disposed and "id" is correct', () => {
      beforeEach(async () => {
        callback = sinon.spy();
        subscription = client.createSubscriptionHandler(msg, callback);
        subscription(undefined, {
          data: JSONCodec().encode({
            ...responseMessage,
            isDisposed: true,
          }),
        });
      });

      it('should call callback with dispose param', () => {
        expect(callback.called).to.be.true;
        expect(
          callback.calledWith({
            isDisposed: true,
            response: responseMessage.response,
            err: undefined,
          }),
        ).to.be.true;
      });
    });
    describe('disposed and "id" is incorrect', () => {
      beforeEach(async () => {
        callback = sinon.spy();
        subscription = client.createSubscriptionHandler(
          {
            ...msg,
            id: '2',
          },
          callback,
        );
        subscription(undefined, {
          data: JSONCodec().encode({
            ...responseMessage,
            isDisposed: true,
          }),
        });
      });

      it('should not call callback', () => {
        expect(callback.called).to.be.false;
      });
    });
  });
  describe('close', () => {
    let natsClose: sinon.SinonSpy;
    let natsClient;
    beforeEach(() => {
      natsClose = sinon.spy();
      natsClient = { close: natsClose };
      (client as any).natsClient = natsClient;
    });
    it('should close "natsClient" when it is not null', () => {
      client.close();
      expect(natsClose.called).to.be.true;
    });
  });
  describe('connect', () => {
    let createClientSpy: sinon.SinonSpy;
    let handleStatusUpdatesSpy: sinon.SinonSpy;

    beforeEach(async () => {
      createClientSpy = sinon
        .stub(client, 'createClient')
        .callsFake(() => ({} as any));
      handleStatusUpdatesSpy = sinon.spy(client, 'handleStatusUpdates');

      await client.connect();
    });
    afterEach(() => {
      createClientSpy.restore();
      handleStatusUpdatesSpy.restore();
    });
    describe('when is not connected', () => {
      beforeEach(async () => {
        client['natsClient'] = null;
        await client.connect();
      });
      it('should call "handleStatusUpdatesSpy" once', async () => {
        expect(handleStatusUpdatesSpy.called).to.be.true;
      });
      it('should call "createClient" once', async () => {
        expect(createClientSpy.called).to.be.true;
      });
    });
    describe('when is connected', () => {
      beforeEach(() => {
        client['natsClient'] = { test: true } as any;
        client['connection'] = Promise.resolve(true);
      });
      it('should not call "createClient"', () => {
        expect(createClientSpy.called).to.be.false;
      });
      it('should not call "handleStatusUpdatesSpy"', () => {
        expect(handleStatusUpdatesSpy.called).to.be.false;
      });
    });
  });
  describe('handleStatusUpdates', () => {
    it('should retrieve "status()" async iterator', () => {
      const clientMock = {
        status: sinon.stub().returns({
          [Symbol.asyncIterator]: [],
        }),
      };
      client.handleStatusUpdates(clientMock as any);
      expect(clientMock.status.called).to.be.true;
    });

    it('should log "disconnect" and "error" statuses as "errors"', async () => {
      const logErrorSpy = sinon.spy((client as any).logger, 'error');
      const clientMock = {
        status: sinon.stub().returns({
          async *[Symbol.asyncIterator]() {
            yield { type: 'disconnect', data: 'localhost' };
            yield { type: 'error', data: {} };
          },
        }),
      };
      await client.handleStatusUpdates(clientMock as any);
      expect(logErrorSpy.calledTwice).to.be.true;
      expect(
        logErrorSpy.calledWith(
          `NatsError: type: "disconnect", data: "localhost".`,
        ),
      );
      expect(
        logErrorSpy.calledWith(`NatsError: type: "disconnect", data: "{}".`),
      );
    });
    it('should log other statuses as "logs"', async () => {
      const logSpy = sinon.spy((client as any).logger, 'log');
      const clientMock = {
        status: sinon.stub().returns({
          async *[Symbol.asyncIterator]() {
            yield { type: 'non-disconnect', data: 'localhost' };
            yield { type: 'warn', data: {} };
          },
        }),
      };
      await client.handleStatusUpdates(clientMock as any);
      expect(logSpy.calledTwice).to.be.true;
      expect(
        logSpy.calledWith(
          `NatsStatus: type: "non-disconnect", data: "localhost".`,
        ),
      );
      expect(logSpy.calledWith(`NatsStatus: type: "warn", data: "{}".`));
    });
  });
  describe('dispatchEvent', () => {
    const msg = { pattern: 'pattern', data: 'data' };
    let subscribeStub: sinon.SinonStub, natsClient: any;

    beforeEach(() => {
      subscribeStub = sinon
        .stub()
        .callsFake((channel, options) => options.callback());
      natsClient = {
        publish: sinon.spy(),
        subscribe: subscribeStub,
      };
      (client as any).natsClient = natsClient;
    });

    it('should publish packet', async () => {
      await client['dispatchEvent'](msg);

      expect(natsClient.publish.called).to.be.true;
    });
    it('should throw error', async () => {
      subscribeStub.callsFake((channel, options) =>
        options.callback(new Error()),
      );
      client['dispatchEvent'](msg).catch(err =>
        expect(err).to.be.instanceOf(Error),
      );
    });
  });
});
