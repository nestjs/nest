import { expect } from 'chai';
import * as sinon from 'sinon';
import { ClientGCPubSub } from '../../client';
import { ErrorCode } from '../../external/gc-pubsub.interface';

describe('ClientGCPubSub', () => {
  let client: ClientGCPubSub;
  let pubsub;
  let topicMock;
  let subscriptionMock;
  let createClient: sinon.SinonStub;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    client = new ClientGCPubSub({});

    subscriptionMock = {
      create: sandbox.stub().resolves(),
      close: sandbox.stub().resolves(),
      on: sandbox.stub().returnsThis(),
    };

    topicMock = {
      create: sandbox.stub().resolves(),
      publishJSON: sandbox.stub().resolves(),
      subscription: sandbox.stub().returns(subscriptionMock),
    };

    pubsub = {
      topic: sandbox.stub().callsFake(() => topicMock),
      close: sandbox.spy(),
    };
    createClient = sandbox.stub(client, 'createClient').callsFake(() => pubsub);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('connect', () => {
    describe('when is not connected', () => {
      beforeEach(async () => {
        try {
          client['client'] = null;
          await client.connect();
        } catch {}
      });
      it('should call "createClient" once', async () => {
        expect(createClient.called).to.be.true;
      });
      it('should call "client.topic" once', async () => {
        expect(pubsub.topic.called).to.be.true;
      });
      it('should call "topic.create" once', async () => {
        expect(topicMock.create.called).to.be.true;
      });
      it('should call "topic.subscription" once', async () => {
        expect(topicMock.subscription.called).to.be.true;
      });
      it('should call "subscription.create" once', async () => {
        expect(subscriptionMock.create.called).to.be.true;
      });
      it('should call "subscription.on" twice', async () => {
        expect(subscriptionMock.on.callCount).to.eq(2);
      });
    });

    describe('when is connected', () => {
      beforeEach(async () => {
        try {
          client['client'] = pubsub;
          await client.connect();
        } catch {}
      });
      it('should not call "createClient"', async () => {
        expect(createClient.called).to.be.false;
      });
      it('should not call "client.topic"', async () => {
        expect(pubsub.topic.called).to.be.false;
      });
      it('should not call "topic.create"', async () => {
        expect(topicMock.create.called).to.be.false;
      });
      it('should not call "topic.subscription"', async () => {
        expect(topicMock.subscription.called).to.be.false;
      });
      it('should not call "subscription.create"', async () => {
        expect(subscriptionMock.create.called).to.be.false;
      });
      it('should not call "subscription.on"', async () => {
        expect(subscriptionMock.on.callCount).to.eq(0);
      });
    });
  });
  describe('publish', () => {
    const pattern = 'test';
    const msg = { pattern, data: 'data' };

    beforeEach(() => {
      (client as any).topic = topicMock;
    });
    it('should send message to a proper topic', () => {
      client['publish'](msg, () => {
        expect(topicMock.publishJSON.called).to.be.true;
        expect(topicMock.publishJSON.getCall(0).args[0]).to.be.eql(msg);
      });
    });
    describe('on dispose', () => {
      it('should remove listener from routing map', () => {
        client['publish'](msg, () => ({}))();

        expect(client['routingMap'].size).to.be.eq(0);
      });
    });
    describe('on error', () => {
      it('should call callback', () => {
        const callback = sandbox.spy();
        sinon.stub(client, 'assignPacketId' as any).callsFake(() => {
          throw new Error();
        });
        client['publish'](msg, callback);
        expect(callback.called).to.be.true;
        expect(callback.getCall(0).args[0].err).to.be.instanceof(Error);
      });
    });
  });
  describe('handleResponse', () => {
    let callback;
    const id = '1';

    beforeEach(() => {
      callback = sandbox.spy();
    });

    describe('when disposed', () => {
      beforeEach(() => {
        client['routingMap'].set(id, callback);
        client.handleResponse({
          ackId: 'id',
          publishTime: new Date(),
          attributes: {},
          id: 'id',
          received: 0,
          deliveryAttempt: 1,
          ack: () => {},
          modAck: () => {},
          nack: () => {},
          data: Buffer.from(JSON.stringify({ id, isDisposed: true })),
        });
      });
      it('should emit disposed callback', () => {
        expect(callback.called).to.be.true;
        expect(
          callback.calledWith({
            err: undefined,
            response: undefined,
            isDisposed: true,
          }),
        ).to.be.true;
      });
    });
    describe('when not disposed', () => {
      let buffer;
      beforeEach(() => {
        buffer = { id, err: undefined, response: 'res' };
        client['routingMap'].set(id, callback);
        client.handleResponse({
          ackId: 'id',
          publishTime: new Date(),
          attributes: {},
          id: 'id',
          received: 0,
          deliveryAttempt: 1,
          ack: () => {},
          modAck: () => {},
          nack: () => {},
          data: Buffer.from(JSON.stringify(buffer)),
        });
      });
      it('should not close server', () => {
        expect(pubsub.close.called).to.be.false;
      });
      it('should call callback with error and response data', () => {
        expect(callback.called).to.be.true;
        expect(
          callback.calledWith({
            err: buffer.err,
            response: buffer.response,
          }),
        ).to.be.true;
      });
    });
  });
  describe('close', () => {
    beforeEach(async () => {
      await client.connect();
      await client.close();
    });
    it('should call "replySubscription.close"', function () {
      expect(subscriptionMock.close.called).to.be.true;
    });
    it('should close() pubsub', () => {
      expect(pubsub.close.called).to.be.true;
    });
    it('should set "client" to null', () => {
      expect((client as any).client).to.be.null;
    });
    it('should set "topic" to null', () => {
      expect((client as any).topic).to.be.null;
    });
    it('should set "replySubscription" to null', () => {
      expect((client as any).replySubscription).to.be.null;
    });
  });
  describe('dispatchEvent', () => {
    const msg = { pattern: 'pattern', data: 'data' };

    beforeEach(() => {
      (client as any).topic = topicMock;
    });
    it('should publish packet', async () => {
      await client['dispatchEvent'](msg);
      expect(topicMock.publishJSON.called).to.be.true;
    });
    it('should throw error', async () => {
      topicMock.publishJSON.callsFake((a, b, c, d) => d(new Error()));
      client['dispatchEvent'](msg).catch(err =>
        expect(err).to.be.instanceOf(Error),
      );
    });
  });
  describe('createIfNotExists', () => {
    it('should throw error', async () => {
      const create = sandbox.stub().rejects({ code: 7 });
      try {
        await client['createIfNotExists'](create);
      } catch (error) {
        expect(error).to.include({ code: 7 });
      }
      expect(create.called).to.be.true;
    });
    it('should skip error', async () => {
      const create = sandbox.stub().rejects({ code: ErrorCode.ALREADY_EXISTS });
      await client['createIfNotExists'](create);
      expect(create.called).to.be.true;
    });
  });
});
