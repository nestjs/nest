import { expect } from 'chai';
import * as sinon from 'sinon';
import { NO_MESSAGE_HANDLER } from '../../constants';
import { ServerGCPubSub } from '../../server';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context';
import { ErrorCode } from '../../external/gc-pubsub.interface';

describe('ServerGCPubSub', () => {
  let server: ServerGCPubSub;
  let pubsub;
  let topicMock;
  let subscriptionMock;
  let createClient: sinon.SinonStub;
  let sandbox: sinon.SinonSandbox;
  const objectToMap = obj =>
    new Map(Object.keys(obj).map(key => [key, obj[key]]) as any);

  beforeEach(() => {
    server = new ServerGCPubSub({});

    sandbox = sinon.createSandbox();

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
      topic: sandbox.stub().returns(topicMock),
      close: sandbox.spy(),
    };

    createClient = sandbox.stub(server, 'createClient').returns(pubsub);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('listen', () => {
    beforeEach(async () => {
      await server.listen(() => {});
    });

    it('should call "createClient"', () => {
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
  describe('close', () => {
    beforeEach(async () => {
      await server.listen(() => {});
      await server.close();
    });
    it('should call "subscription.close"', function () {
      expect(subscriptionMock.close.called).to.be.true;
    });
    it('should close() pubsub', () => {
      expect(pubsub.close.called).to.be.true;
    });
  });
  describe('handleMessage', () => {
    const msg = {
      pattern: 'test',
      data: 'tests',
      id: '3',
    };
    beforeEach(async () => {
      await server.listen(() => {});
    });

    it('should send NO_MESSAGE_HANDLER error if key does not exists in handlers object', async () => {
      await server.handleMessage({
        ackId: 'id',
        publishTime: new Date(),
        attributes: {},
        id: 'id',
        received: 0,
        deliveryAttempt: 1,
        ack: () => {},
        modAck: () => {},
        nack: () => {},
        data: Buffer.from(JSON.stringify(msg)),
      });
      expect(
        topicMock.publishJSON.calledWith({
          id: msg.id,
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        }),
      ).to.be.true;
    });
    it('should call handler if exists in handlers object', async () => {
      const handler = sinon.spy();
      (server as any).messageHandlers = objectToMap({
        [msg.pattern]: handler as any,
      });
      await server.handleMessage({
        ackId: 'id',
        publishTime: new Date(),
        attributes: {},
        id: 'id',
        received: 0,
        deliveryAttempt: 1,
        ack: () => {},
        modAck: () => {},
        nack: () => {},
        data: Buffer.from(JSON.stringify(msg)),
      });
      expect(handler.calledOnce).to.be.true;
    });
  });
  describe('sendMessage', () => {
    beforeEach(async () => {
      await server.listen(() => {});
    });

    it('should publish message to indicated topic', async () => {
      const message = { test: true };
      const replyTo = 'test';
      const correlationId = '0';

      await server.sendMessage(message, replyTo, correlationId);
      expect(
        topicMock.publishJSON.calledWith({ ...message, id: correlationId }),
      ).to.be.true;
    });
  });

  describe('handleEvent', () => {
    const channel = 'test';
    const data = 'test';

    it('should call handler with expected arguments', () => {
      const handler = sandbox.spy();
      (server as any).messageHandlers = objectToMap({
        [channel]: handler,
      });

      server.handleEvent(
        channel,
        { pattern: '', data },
        new BaseRpcContext([]),
      );
      expect(handler.calledWith(data)).to.be.true;
    });
  });

  describe('createIfNotExists', () => {
    it('should throw error', async () => {
      const create = sandbox.stub().rejects({ code: 7 });
      try {
        await server['createIfNotExists'](create);
      } catch (error) {
        expect(error).to.include({ code: 7 });
      }
      expect(create.called).to.be.true;
    });
    it('should skip error', async () => {
      const create = sandbox.stub().rejects({ code: ErrorCode.ALREADY_EXISTS });
      await server['createIfNotExists'](create);
      expect(create.called).to.be.true;
    });
  });
});
