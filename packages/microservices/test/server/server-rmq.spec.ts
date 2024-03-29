import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import { NO_MESSAGE_HANDLER } from '../../constants';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context';
import { ServerRMQ } from '../../server/server-rmq';
import { RmqContext } from '../../ctx-host';

describe('ServerRMQ', () => {
  let server: ServerRMQ;

  const objectToMap = obj =>
    new Map(Object.keys(obj).map(key => [key, obj[key]]) as any);

  beforeEach(() => {
    server = new ServerRMQ({});
  });

  describe('constructor', () => {
    it(`should fallback to queueOptions.noAssert when 'noAssert' is undefined`, () => {
      const queueOptions = {
        noAssert: true,
      };
      const instance = new ServerRMQ({
        queueOptions,
      });

      expect(instance).property('noAssert').to.eq(queueOptions.noAssert);
    });
  });

  describe('listen', () => {
    let createClient: sinon.SinonStub;
    let onStub: sinon.SinonStub;
    let createChannelStub: sinon.SinonStub;
    let setupChannelStub: sinon.SinonStub;
    let client: any;
    let callbackSpy: sinon.SinonSpy;

    beforeEach(() => {
      onStub = sinon
        .stub()
        .callsFake((event, callback) => event === 'connect' && callback());
      createChannelStub = sinon.stub().callsFake(({ setup }) => setup());
      setupChannelStub = sinon
        .stub(server, 'setupChannel')
        .callsFake(() => ({}) as any);

      client = {
        on: onStub,
        createChannel: createChannelStub,
      };
      createClient = sinon.stub(server, 'createClient').callsFake(() => client);
      callbackSpy = sinon.spy();
    });
    afterEach(() => {
      setupChannelStub.restore();
    });
    it('should call "createClient"', () => {
      server.listen(callbackSpy);
      expect(createClient.called).to.be.true;
    });
    it('should bind "connect" event to handler', () => {
      server.listen(callbackSpy);
      expect(onStub.getCall(0).args[0]).to.be.equal('connect');
    });
    it('should bind "disconnect" event to handler', () => {
      server.listen(callbackSpy);
      expect(onStub.getCall(1).args[0]).to.be.equal('disconnect');
    });
    it('should bind "connectFailed" event to handler', () => {
      server.listen(callbackSpy);
      expect(onStub.getCall(2).args[0]).to.be.equal('connectFailed');
    });
    describe('when "start" throws an exception', () => {
      it('should call callback with a thrown error as an argument', () => {
        const error = new Error('random error');

        sinon.stub(server, 'start').callsFake(() => {
          throw error;
        });
        server.listen(callbackSpy);
        expect(callbackSpy.calledWith(error)).to.be.true;
      });
    });
  });
  describe('close', () => {
    const rmqServer = { close: sinon.spy() };
    const rmqChannel = { close: sinon.spy() };

    beforeEach(() => {
      (server as any).server = rmqServer;
      (server as any).channel = rmqChannel;
    });
    it('should close server', () => {
      server.close();
      expect(rmqServer.close.called).to.be.true;
    });
    it('should close channel', () => {
      server.close();
      expect(rmqChannel.close.called).to.be.true;
    });
  });

  describe('handleMessage', () => {
    const createMessage = payload => ({
      content: {
        toString: () => JSON.stringify(payload),
      },
      properties: { correlationId: 1 },
    });
    const pattern = 'test';
    const msg = createMessage({
      pattern,
      data: 'tests',
      id: '3',
    });
    const channel = {
      nack: sinon.spy(),
    };

    let sendMessageStub: sinon.SinonStub;

    beforeEach(() => {
      sendMessageStub = sinon.stub(server, 'sendMessage').callsFake(() => ({}));
      (server as any).channel = channel;
    });
    afterEach(() => {
      channel.nack.resetHistory();
    });
    it('should call "handleEvent" if identifier is not present', async () => {
      const handleEventSpy = sinon.spy(server, 'handleEvent');
      await server.handleMessage(createMessage({ pattern: '', data: '' }), '');
      expect(handleEventSpy.called).to.be.true;
    });
    it('should send NO_MESSAGE_HANDLER error if key does not exists in handlers object', async () => {
      await server.handleMessage(msg, '');
      expect(
        sendMessageStub.calledWith({
          id: '3',
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        }),
      ).to.be.true;
    });
    it('should call handler if exists in handlers object', async () => {
      const handler = sinon.spy();
      (server as any).messageHandlers = objectToMap({
        [pattern]: handler as any,
      });
      await server.handleMessage(msg, '');
      expect(handler.calledOnce).to.be.true;
    });
    it('should not throw if the message is an invalid json', async () => {
      const invalidMsg = {
        content: {
          toString: () => 'd',
        },
        properties: { correlationId: 1 },
      };
      const handler = sinon.spy();
      (server as any).messageHandlers = objectToMap({
        [pattern]: handler as any,
      });

      return server.handleMessage(invalidMsg, '').catch(() => {
        assert.fail('Was not supposed to throw an error');
      });
    });
    it('should negative acknowledge if message does not exists in handlers object and noAck option is false', async () => {
      (server as any).noAck = false;
      await server.handleMessage(msg, '');
      expect(channel.nack.calledWith(msg, false, false)).to.be.true;
      expect(
        sendMessageStub.calledWith({
          id: '3',
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        }),
      ).to.be.true;
    });
    it('should not negative acknowledge if key does not exists in handlers object and noAck option is true', async () => {
      await server.handleMessage(msg, '');
      expect(channel.nack.notCalled).to.be.true;
      expect(
        sendMessageStub.calledWith({
          id: '3',
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        }),
      ).to.be.true;
    });
  });
  describe('setupChannel', () => {
    const queue = 'test';
    const queueOptions = {};
    const isGlobalPrefetchCount = true;
    const prefetchCount = 10;

    let channel: any = {};

    beforeEach(() => {
      (server as any)['queue'] = queue;
      (server as any)['queueOptions'] = queueOptions;
      (server as any)['isGlobalPrefetchCount'] = isGlobalPrefetchCount;
      (server as any)['prefetchCount'] = prefetchCount;

      channel = {
        assertQueue: sinon.spy(() => ({})),
        prefetch: sinon.spy(),
        consume: sinon.spy(),
      };
    });
    it('should call "assertQueue" with queue and queue options when noAssert is false', async () => {
      server['noAssert' as any] = false;

      await server.setupChannel(channel, () => null);
      expect(channel.assertQueue.calledWith(queue, queueOptions)).to.be.true;
    });
    it('should not call "assertQueue" when noAssert is true', async () => {
      server['noAssert' as any] = true;

      await server.setupChannel(channel, () => null);
      expect(channel.assertQueue.called).not.to.be.true;
    });
    it('should call "prefetch" with prefetchCount and "isGlobalPrefetchCount"', async () => {
      await server.setupChannel(channel, () => null);
      expect(channel.prefetch.calledWith(prefetchCount, isGlobalPrefetchCount))
        .to.be.true;
    });
    it('should call "consumeChannel" method', async () => {
      await server.setupChannel(channel, () => null);
      expect(channel.consume.called).to.be.true;
    });
    it('should call "resolve" function', async () => {
      const resolve = sinon.spy();
      await server.setupChannel(channel, resolve);
      expect(resolve.called).to.be.true;
    });
  });

  describe('sendMessage', () => {
    let channel: any;

    beforeEach(() => {
      channel = {
        sendToQueue: sinon.spy(),
      };
      server['channel'] = channel;
    });

    it('should publish message to indicated queue', () => {
      const message = { test: true };
      const replyTo = 'test';
      const correlationId = '0';

      server.sendMessage(message, replyTo, correlationId);
      expect(
        channel.sendToQueue.calledWith(
          replyTo,
          Buffer.from(JSON.stringify(message)),
          { correlationId },
        ),
      ).to.be.true;
    });
  });

  describe('handleEvent', () => {
    const channel = 'test';
    const data = 'test';

    it('should call handler with expected arguments', () => {
      const handler = sinon.spy();
      (server as any).messageHandlers = objectToMap({
        [channel]: handler,
      });

      server.handleEvent(
        channel,
        { pattern: '', data },
        new RmqContext([{}, {}, '']),
      );
      expect(handler.calledWith(data)).to.be.true;
    });

    it('should negative acknowledge without retrying if key does not exists in handlers object and noAck option is false', () => {
      const nack = sinon.spy();
      const message = { pattern: 'no-exists', data };
      (server as any).channel = {
        nack,
      };
      (server as any).noAck = false;
      server.handleEvent(channel, message, new RmqContext([message, '', '']));

      expect(nack.calledWith(message, false, false)).to.be.true;
    });

    it('should not negative acknowledge if key does not exists in handlers object but noAck option is true', () => {
      const nack = sinon.spy();
      const message = { pattern: 'no-exists', data };
      (server as any).channel = {
        nack,
      };
      (server as any).noAck = true;
      server.handleEvent(channel, message, new RmqContext([message, '', '']));

      expect(nack.calledWith(message, false, false)).not.to.be.true;
    });
  });
});
