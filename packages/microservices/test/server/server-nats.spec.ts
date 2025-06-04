import { expect } from 'chai';
import * as sinon from 'sinon';
import { NO_MESSAGE_HANDLER } from '../../constants';
import { NatsContext } from '../../ctx-host';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context';
import { ServerNats } from '../../server/server-nats';
import { objectToMap } from './utils/object-to-map';

// type NatsMsg = import('@nats-io/nats-core').Msg;
type NatsMsg = any;

describe('ServerNats', () => {
  let server: ServerNats;
  let untypedServer: any;

  beforeEach(() => {
    server = new ServerNats({});
    untypedServer = server as any;
  });
  describe('listen', () => {
    let client: any;
    let callbackSpy: sinon.SinonSpy;

    beforeEach(() => {
      sinon.stub(server, 'createNatsClient').callsFake(() => client);
      callbackSpy = sinon.spy();
    });
    describe('when "start" throws an exception', async () => {
      it('should call callback with a thrown error as an argument', async () => {
        const error = new Error('random error');

        sinon.stub(server, 'start').callsFake(() => {
          throw error;
        });
        await server.listen(callbackSpy);
        expect(callbackSpy.calledWith(error)).to.be.true;
      });
    });
  });
  describe('close', () => {
    const natsClient = { close: sinon.spy() };
    beforeEach(() => {
      untypedServer.natsClient = natsClient;
    });
    it('should close natsClient', async () => {
      await server.close();
      expect(natsClient.close.called).to.be.true;
    });

    describe('when "gracefulShutdown" is true', () => {
      const waitForGracePeriod = sinon.spy();
      const subscriptions = [
        { unsubscribe: sinon.spy() },
        { unsubscribe: sinon.spy() },
      ];
      beforeEach(() => {
        (server as any).subscriptions = subscriptions;
        (server as any).waitForGracePeriod = waitForGracePeriod;
        (server as any).options.gracefulShutdown = true;
      });

      it('should unsubscribe all subscriptions', async () => {
        await server.close();
        for (const subscription of subscriptions) {
          expect(subscription.unsubscribe.calledOnce).to.be.true;
        }
      });

      it('should call "waitForGracePeriod"', async () => {
        await server.close();
        expect(waitForGracePeriod.called).to.be.true;
      });
    });

    describe('when "gracefulShutdown" is false', () => {
      const waitForGracePeriod = sinon.spy();
      const subscriptions = [
        { unsubscribe: sinon.spy() },
        { unsubscribe: sinon.spy() },
      ];
      beforeEach(() => {
        (server as any).subscriptions = subscriptions;
        (server as any).waitForGracePeriod = waitForGracePeriod;
        (server as any).options.gracefulShutdown = false;
      });
      it('should not unsubscribe all subscriptions', async () => {
        await server.close();
        for (const subscription of subscriptions) {
          expect(subscription.unsubscribe.called).to.be.false;
        }
      });

      it('should not call "waitForGracePeriod"', async () => {
        await server.close();
        expect(waitForGracePeriod.called).to.be.false;
      });
    });
  });
  describe('bindEvents', () => {
    let onSpy: sinon.SinonSpy, subscribeSpy: sinon.SinonSpy, natsClient;
    const pattern = 'test';
    const messageHandler = sinon.spy();

    beforeEach(() => {
      onSpy = sinon.spy();
      subscribeSpy = sinon.spy();
      natsClient = {
        on: onSpy,
        subscribe: subscribeSpy,
      };
      untypedServer.messageHandlers = objectToMap({
        [pattern]: messageHandler,
      });
    });

    it('should subscribe to every pattern', () => {
      server.bindEvents(natsClient);
      expect(subscribeSpy.calledWith(pattern)).to.be.true;
    });

    it('should use a per pattern queue if provided', () => {
      const queue = 'test';
      untypedServer.messageHandlers = objectToMap({
        [pattern]: Object.assign(messageHandler, {
          extras: {
            queue,
          },
        }),
      });
      server.bindEvents(natsClient);
      const lastCall = subscribeSpy.lastCall;
      expect(lastCall.args[1].queue).to.be.eql(queue);
    });

    it('should fill the subscriptions array properly', () => {
      server.bindEvents(natsClient);
      expect(server['subscriptions'].length).to.be.equals(1);
    });
  });
  describe('getMessageHandler', () => {
    it(`should return function`, () => {
      expect(typeof server.getMessageHandler(null!)).to.be.eql('function');
    });
    describe('handler', () => {
      it('should call "handleMessage"', async () => {
        const handleMessageStub = sinon
          .stub(server, 'handleMessage')
          .callsFake(() => null!);
        await server.getMessageHandler('')('' as any, '');
        expect(handleMessageStub.called).to.be.true;
      });
    });
  });
  describe('handleMessage', () => {
    let getPublisherSpy: sinon.SinonSpy;

    const channel = 'test';
    const id = '3';

    beforeEach(() => {
      getPublisherSpy = sinon.spy();
      sinon.stub(server, 'getPublisher').callsFake(() => getPublisherSpy);
    });
    it('should call "handleEvent" if identifier is not present', async () => {
      const handleEventSpy = sinon.spy(server, 'handleEvent');
      const data = JSON.stringify({ id: 10 });
      const natsMsg: NatsMsg = {
        data,
        subject: channel,
        sid: +id,
        respond: sinon.spy(),
        json: () => JSON.parse(data),
      };
      await server.handleMessage(channel, natsMsg);
      expect(handleEventSpy.called).to.be.true;
    });
    it(`should publish NO_MESSAGE_HANDLER if pattern does not exist in messageHandlers object`, async () => {
      const data = JSON.stringify({
        id,
        pattern: 'test',
        data: 'test',
      });
      const natsMsg: NatsMsg = {
        data,
        subject: channel,
        sid: +id,
        respond: sinon.spy(),
        json: () => JSON.parse(data),
      };

      await server.handleMessage(channel, natsMsg);
      expect(
        getPublisherSpy.calledWith({
          id,
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        }),
      ).to.be.true;
    });
    it(`should call handler with expected arguments`, async () => {
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [channel]: handler,
      });

      const headers = {};
      const natsContext = new NatsContext([channel, headers]);

      const data = JSON.stringify({
        pattern: channel,
        data: 'test',
        id,
      });
      const natsMsg: NatsMsg = {
        data,
        subject: channel,
        sid: +id,
        respond: sinon.spy(),
        headers,
        json: () => JSON.parse(data),
      };
      await server.handleMessage(channel, natsMsg);
      expect(handler.calledWith('test', natsContext)).to.be.true;
    });
  });
  describe('getPublisher', () => {
    const id = '1';

    it(`should return function`, () => {
      const natsMsg: NatsMsg = {
        data: new Uint8Array(),
        subject: '',
        sid: +id,
        respond: sinon.spy(),
        json: () => JSON.parse(''),
      };
      expect(typeof server.getPublisher(natsMsg, id)).to.be.eql('function');
    });
    it(`should call "respond" when reply topic provided`, () => {
      const replyTo = 'test';
      const natsMsg = {
        data: new Uint8Array(),
        subject: '',
        sid: +id,
        respond: sinon.spy(),
        reply: replyTo,
      } as NatsMsg;
      const publisher = server.getPublisher(natsMsg, id);

      const respond = 'test';
      publisher({ respond, id });
      expect(natsMsg.respond.calledWith(JSON.stringify({ respond, id }))).to.be
        .true;
    });
    it(`should not call "publish" when replyTo NOT provided`, () => {
      const replyTo = undefined;
      const natsMsg = {
        data: new Uint8Array(),
        subject: '',
        reply: replyTo,
        sid: +id,
        respond: sinon.spy(),
      } as NatsMsg;
      const publisher = server.getPublisher(natsMsg, id);

      const respond = 'test';
      publisher({ respond, id });
      expect(natsMsg.respond.notCalled);
    });
  });
  describe('handleEvent', () => {
    const channel = 'test';
    const data = 'test';

    it('should call handler with expected arguments', async () => {
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [channel]: handler,
      });

      await server.handleEvent(
        channel,
        { pattern: '', data },
        new BaseRpcContext([]),
      );
      expect(handler.calledWith(data)).to.be.true;
    });
  });
  describe('handleStatusUpdates', () => {
    it('should retrieve "status()" async iterator', () => {
      const serverMock = {
        status: sinon.stub().returns({
          [Symbol.asyncIterator]: [],
        }),
      };
      void server.handleStatusUpdates(serverMock as any);
      expect(serverMock.status.called).to.be.true;
    });

    it('should log "disconnect" and "error" statuses as "errors"', async () => {
      const logErrorSpy = sinon.spy(untypedServer.logger, 'error');
      const serverMock = {
        status: sinon.stub().returns({
          async *[Symbol.asyncIterator]() {
            yield { type: 'disconnect', data: 'localhost' };
            yield { type: 'error', data: {} };
          },
        }),
      };
      await server.handleStatusUpdates(serverMock as any);
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
      const logSpy = sinon.spy(untypedServer.logger, 'log');
      const serverMock = {
        status: sinon.stub().returns({
          async *[Symbol.asyncIterator]() {
            yield { type: 'non-disconnect', data: 'localhost' };
            yield { type: 'warn', data: {} };
          },
        }),
      };
      await server.handleStatusUpdates(serverMock as any);
      expect(logSpy.calledTwice).to.be.true;
      expect(
        logSpy.calledWith(
          `NatsStatus: type: "non-disconnect", data: "localhost".`,
        ),
      );
      expect(logSpy.calledWith(`NatsStatus: type: "warn", data: "{}".`));
    });
  });
});
