import { NO_MESSAGE_HANDLER } from '../../constants.js';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context.js';
import { NatsContext } from '../../ctx-host/index.js';
import { ServerNats } from '../../server/server-nats.js';
import { objectToMap } from './utils/object-to-map.js';

// type NatsMsg = import('@nats-io/nats-core').Msg;
type NatsMsg = any;

describe('ServerNats', () => {
  let server: ServerNats;
  let untypedServer: any;

  beforeEach(async () => {
    server = new ServerNats({});
    untypedServer = server as any;

    // Eagerly init serializer/deserializer (loadPackage is async in ESM)
    if (typeof untypedServer.serializer?.init === 'function') {
      await untypedServer.serializer.init();
    }
    if (typeof untypedServer.deserializer?.init === 'function') {
      await untypedServer.deserializer.init();
    }
  });
  describe('listen', () => {
    let client: any;
    let callbackSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      client = {
        status: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {},
        }),
      };
      vi.spyOn(server, 'createNatsClient').mockResolvedValue(client);
      callbackSpy = vi.fn();
    });
    describe('when "start" throws an exception', () => {
      it('should call callback with a thrown error as an argument', async () => {
        const error = new Error('random error');

        vi.spyOn(server, 'start').mockImplementation(() => {
          throw error;
        });
        await server.listen(callbackSpy as any);
        expect(callbackSpy).toHaveBeenCalledWith(error);
      });
    });
  });
  describe('close', () => {
    const natsClient = { close: vi.fn() };
    beforeEach(() => {
      untypedServer.natsClient = natsClient;
    });
    it('should close natsClient', async () => {
      await server.close();
      expect(natsClient.close).toHaveBeenCalled();
    });

    describe('when "gracefulShutdown" is true', () => {
      const waitForGracePeriod = vi.fn();
      const subscriptions = [
        { unsubscribe: vi.fn() },
        { unsubscribe: vi.fn() },
      ];
      beforeEach(() => {
        (server as any).subscriptions = subscriptions;
        (server as any).waitForGracePeriod = waitForGracePeriod;
        (server as any).options.gracefulShutdown = true;
      });

      it('should unsubscribe all subscriptions', async () => {
        await server.close();
        for (const subscription of subscriptions) {
          expect(subscription.unsubscribe).toHaveBeenCalledOnce();
        }
      });

      it('should call "waitForGracePeriod"', async () => {
        await server.close();
        expect(waitForGracePeriod).toHaveBeenCalled();
      });
    });

    describe('when "gracefulShutdown" is false', () => {
      const waitForGracePeriod = vi.fn();
      const subscriptions = [
        { unsubscribe: vi.fn() },
        { unsubscribe: vi.fn() },
      ];
      beforeEach(() => {
        (server as any).subscriptions = subscriptions;
        (server as any).waitForGracePeriod = waitForGracePeriod;
        (server as any).options.gracefulShutdown = false;
      });
      it('should not unsubscribe all subscriptions', async () => {
        await server.close();
        for (const subscription of subscriptions) {
          expect(subscription.unsubscribe).not.toHaveBeenCalled();
        }
      });

      it('should not call "waitForGracePeriod"', async () => {
        await server.close();
        expect(waitForGracePeriod).not.toHaveBeenCalled();
      });
    });
  });
  describe('bindEvents', () => {
    let onSpy: ReturnType<typeof vi.fn>,
      subscribeSpy: ReturnType<typeof vi.fn>,
      natsClient;
    const pattern = 'test';
    const messageHandler = vi.fn();

    beforeEach(() => {
      onSpy = vi.fn();
      subscribeSpy = vi.fn();
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
      expect(subscribeSpy).toHaveBeenCalledWith(
        pattern,
        expect.objectContaining({}),
      );
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
      const lastCallArgs =
        subscribeSpy.mock.calls[subscribeSpy.mock.calls.length - 1];
      expect(lastCallArgs[1].queue).toEqual(queue);
    });

    it('should fill the subscriptions array properly', () => {
      server.bindEvents(natsClient);
      expect(server['subscriptions'].length).toBe(1);
    });
  });
  describe('getMessageHandler', () => {
    it(`should return function`, () => {
      expect(typeof server.getMessageHandler(null!)).toEqual('function');
    });
    describe('handler', () => {
      it('should call "handleMessage"', async () => {
        const handleMessageStub = vi
          .spyOn(server, 'handleMessage')
          .mockImplementation(() => null!);
        await server.getMessageHandler('')('' as any, '');
        expect(handleMessageStub).toHaveBeenCalled();
      });
    });
  });
  describe('handleMessage', () => {
    let getPublisherSpy: ReturnType<typeof vi.fn>;

    const channel = 'test';
    const id = '3';

    beforeEach(() => {
      getPublisherSpy = vi.fn();
      vi.spyOn(server, 'getPublisher').mockImplementation(
        () => getPublisherSpy as any,
      );
    });
    it('should call "handleEvent" if identifier is not present', async () => {
      const handleEventSpy = vi.spyOn(server, 'handleEvent');
      const data = JSON.stringify({ id: 10 });
      const natsMsg: NatsMsg = {
        data,
        subject: channel,
        sid: +id,
        respond: vi.fn(),
        json: () => JSON.parse(data),
      };
      await server.handleMessage(channel, natsMsg);
      expect(handleEventSpy).toHaveBeenCalled();
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
        respond: vi.fn(),
        json: () => JSON.parse(data),
      };

      await server.handleMessage(channel, natsMsg);
      expect(getPublisherSpy).toHaveBeenCalledWith({
        id,
        status: 'error',
        err: NO_MESSAGE_HANDLER,
      });
    });
    it(`should call handler with expected arguments`, async () => {
      const handler = vi.fn();
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
        respond: vi.fn(),
        headers,
        json: () => JSON.parse(data),
      };
      await server.handleMessage(channel, natsMsg);
      expect(handler).toHaveBeenCalledWith('test', natsContext);
    });
  });
  describe('getPublisher', () => {
    const context = new NatsContext([] as any);
    const id = '1';

    it(`should return function`, () => {
      const natsMsg: NatsMsg = {
        data: new Uint8Array(),
        subject: '',
        sid: +id,
        respond: vi.fn(),
      };
      expect(typeof server.getPublisher(natsMsg, id, context)).toEqual(
        'function',
      );
    });
    it(`should call "respond" when reply topic provided`, () => {
      const replyTo = 'test';
      const natsMsg = {
        data: new Uint8Array(),
        subject: '',
        sid: +id,
        respond: vi.fn(),
        reply: replyTo,
      } as NatsMsg;
      const publisher = server.getPublisher(natsMsg, id, context);

      const respond = 'test';
      publisher({ respond, id });
      expect(natsMsg.respond).toHaveBeenCalledWith(
        JSON.stringify({ respond, id }),
        expect.objectContaining({}),
      );
    });
    it(`should not call "publish" when replyTo NOT provided`, () => {
      const replyTo = undefined;
      const natsMsg = {
        data: new Uint8Array(),
        subject: '',
        reply: replyTo,
        sid: +id,
        respond: vi.fn(),
      } as NatsMsg;
      const publisher = server.getPublisher(natsMsg, id, context);

      const respond = 'test';
      publisher({ respond, id });
      expect(natsMsg.respond).not.toHaveBeenCalled();
    });
  });
  describe('handleEvent', () => {
    const channel = 'test';
    const data = 'test';

    it('should call handler with expected arguments', async () => {
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [channel]: handler,
      });

      await server.handleEvent(
        channel,
        { pattern: '', data },
        new BaseRpcContext([]),
      );
      expect(handler).toHaveBeenCalledWith(data, expect.any(BaseRpcContext));
    });
  });
  describe('handleStatusUpdates', () => {
    it('should retrieve "status()" async iterator', async () => {
      const serverMock = {
        status: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {},
        }),
      };
      await server.handleStatusUpdates(serverMock as any);
      expect(serverMock.status).toHaveBeenCalled();
    });

    it('should log "disconnect" and "error" statuses as "errors"', async () => {
      const logErrorSpy = vi.spyOn(untypedServer.logger, 'error');
      const serverMock = {
        status: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { type: 'disconnect' };
            yield { type: 'error', error: 'Test error' };
          },
        }),
      };
      await server.handleStatusUpdates(serverMock as any);
      expect(logErrorSpy).toHaveBeenCalledTimes(2);
      expect(logErrorSpy).toHaveBeenCalledWith(
        `NatsError: type: "disconnect".`,
      );
      expect(logErrorSpy).toHaveBeenCalledWith(
        `NatsError: type: "error", error: "Test error".`,
      );
    });
    it('should log other statuses as "logs"', async () => {
      const logSpy = vi.spyOn(untypedServer.logger, 'log');
      const serverMock = {
        status: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { type: 'non-disconnect', data: 'localhost' };
            yield { type: 'warn', data: {} };
          },
        }),
      };
      await server.handleStatusUpdates(serverMock as any);
      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenCalledWith(
        `NatsStatus: type: "non-disconnect", data: "localhost".`,
      );
      expect(logSpy).toHaveBeenCalledWith(
        `NatsStatus: type: "warn", data: "{}".`,
      );
    });
  });
});
