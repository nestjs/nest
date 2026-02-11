import { NO_MESSAGE_HANDLER } from '../../constants.js';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context.js';
import { RedisContext } from '../../ctx-host/index.js';
import { ServerRedis } from '../../server/server-redis.js';
import { objectToMap } from './utils/object-to-map.js';

describe('ServerRedis', () => {
  let server: ServerRedis;
  let untypedServer: any;

  beforeEach(() => {
    server = new ServerRedis({});
    untypedServer = server as any;
  });
  describe('listen', () => {
    let onSpy: ReturnType<typeof vi.fn>;
    let connectSpy: ReturnType<typeof vi.fn>;
    let client: any;
    let callbackSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onSpy = vi.fn();
      connectSpy = vi.fn();

      client = {
        on: onSpy,
        connect: connectSpy,
      };
      vi.spyOn(server, 'createRedisClient').mockImplementation(() =>
        Promise.resolve(client),
      );

      callbackSpy = vi.fn();
    });
    it('should bind "error" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onSpy.mock.calls[0][0]).toBe('error');
    });
    it('should call "RedisClient#connect()"', async () => {
      await server.listen(callbackSpy);
      expect(connectSpy).toHaveBeenCalled();
    });
    describe('when "start" throws an exception', () => {
      it('should call callback with a thrown error as an argument', async () => {
        const error = new Error('random error');

        const callbackSpy = vi.fn();
        vi.spyOn(server, 'start').mockImplementation(() => {
          throw error;
        });
        await server.listen(callbackSpy);
        expect(callbackSpy).toHaveBeenCalledWith(error);
      });
    });
  });
  describe('close', () => {
    const pub = { quit: vi.fn() };
    const sub = { quit: vi.fn() };
    beforeEach(() => {
      untypedServer.pubClient = pub;
      untypedServer.subClient = sub;
    });
    it('should close pub & sub server', async () => {
      await server.close();

      expect(pub.quit).toHaveBeenCalledOnce();
      expect(sub.quit).toHaveBeenCalledOnce();
    });
  });
  describe('handleConnection', () => {
    let onSpy: ReturnType<typeof vi.fn>,
      subscribeSpy: ReturnType<typeof vi.fn>,
      sub,
      psub;

    beforeEach(() => {
      onSpy = vi.fn();
      subscribeSpy = vi.fn();
      sub = {
        on: onSpy,
        subscribe: subscribeSpy,
      };
      psub = {
        on: onSpy,
        psubscribe: subscribeSpy,
      };
    });
    it('should bind "message" event to handler if wildcards are disabled', () => {
      server.bindEvents(sub, null);
      expect(onSpy.mock.calls[0][0]).toBe('message');
    });
    it('should bind "pmessage" event to handler if wildcards are enabled', () => {
      untypedServer.options = {};
      untypedServer.options.wildcards = true;

      server.bindEvents(psub, null);
      expect(onSpy.mock.calls[0][0]).toBe('pmessage');
    });

    it('should "subscribe" to each pattern if wildcards are disabled', () => {
      const pattern = 'test';
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [pattern]: handler,
      });
      server.bindEvents(sub, null);
      expect(subscribeSpy).toHaveBeenCalledWith(pattern);
    });

    it('should "psubscribe" to each pattern if wildcards are enabled', () => {
      untypedServer.options = {};
      untypedServer.options.wildcards = true;

      const pattern = 'test';
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [pattern]: handler,
      });
      server.bindEvents(psub, null);
      expect(subscribeSpy).toHaveBeenCalledWith(pattern);
    });
  });
  describe('getMessageHandler', () => {
    it(`should return function`, () => {
      expect(typeof server.getMessageHandler(null)).toEqual('function');
    });
  });
  describe('handleMessage', () => {
    let getPublisherSpy: ReturnType<typeof vi.fn>;

    const channel = 'test';
    const data = 'test';
    const id = '3';

    beforeEach(() => {
      getPublisherSpy = vi.fn();
      vi.spyOn(server, 'getPublisher').mockImplementation(
        () => getPublisherSpy,
      );
    });
    it('should call "handleEvent" if identifier is not present', async () => {
      const handleEventSpy = vi.spyOn(server, 'handleEvent');
      vi.spyOn(server, 'parseMessage').mockImplementation(
        () => ({ data }) as any,
      );

      await server.handleMessage(channel, JSON.stringify({}), null, channel);
      expect(handleEventSpy).toHaveBeenCalled();
    });
    it(`should publish NO_MESSAGE_HANDLER if pattern not exists in messageHandlers object`, async () => {
      vi.spyOn(server, 'parseMessage').mockImplementation(
        () => ({ id, data }) as any,
      );
      await server.handleMessage(
        channel,
        JSON.stringify({ id }),
        null,
        channel,
      );
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
      vi.spyOn(server, 'parseMessage').mockImplementation(
        () => ({ id, data }) as any,
      );

      await server.handleMessage(channel, '', null, channel);
      expect(handler).toHaveBeenCalledWith(data, expect.any(RedisContext));
    });
  });
  describe('getPublisher', () => {
    let publisherSpy: ReturnType<typeof vi.fn>;
    let pub, publisher;

    const id = '1';
    const pattern = 'test';
    const context = new RedisContext([] as any);

    beforeEach(() => {
      publisherSpy = vi.fn();
      pub = {
        publish: publisherSpy,
      };
      publisher = server.getPublisher(pub, pattern, id, context);
    });
    it(`should return function`, () => {
      expect(typeof server.getPublisher(null, null, id, context)).toEqual(
        'function',
      );
    });
    it(`should call "publish" with expected arguments`, () => {
      const respond = 'test';
      publisher({ respond, id });
      expect(publisherSpy).toHaveBeenCalledWith(
        `${pattern}.reply`,
        JSON.stringify({ respond, id }),
      );
    });
  });
  describe('parseMessage', () => {
    it(`should return parsed json`, () => {
      const obj = { test: 'test' };
      expect(server.parseMessage(obj)).toEqual(JSON.parse(JSON.stringify(obj)));
    });
    it(`should not parse argument if it is not an object`, () => {
      const content = 'test';
      expect(server.parseMessage(content)).toBe(content);
    });
  });
  describe('getRequestPattern', () => {
    const test = 'test';
    it(`should leave pattern as it is`, () => {
      const expectedResult = test;
      expect(server.getRequestPattern(test)).toBe(expectedResult);
    });
  });
  describe('getReplyPattern', () => {
    const test = 'test';
    it(`should append ".reply" to string`, () => {
      const expectedResult = test + '.reply';
      expect(server.getReplyPattern(test)).toBe(expectedResult);
    });
  });
  describe('getClientOptions', () => {
    it('should return options object with "retryStrategy" and call "createRetryStrategy"', () => {
      const createSpy = vi.spyOn(server, 'createRetryStrategy');
      const { retryStrategy } = server.getClientOptions()!;
      try {
        retryStrategy!(0);
      } catch {
        // Ignore
      }
      expect(createSpy).toHaveBeenCalled();
    });
  });
  describe('createRetryStrategy', () => {
    describe('when is terminated', () => {
      it('should return undefined', () => {
        untypedServer.isManuallyClosed = true;
        const result = server.createRetryStrategy(0);
        expect(result).toBeUndefined();
      });
    });
    describe('when "retryAttempts" does not exist', () => {
      it('should return undefined', () => {
        untypedServer.options.options = {};
        untypedServer.options.options.retryAttempts = undefined;

        expect(server.createRetryStrategy(4)).toBeUndefined();
      });
    });
    describe('when "attempts" count is max', () => {
      it('should return undefined', () => {
        untypedServer.options.options = {};
        untypedServer.options.options.retryAttempts = 3;

        expect(server.createRetryStrategy(4)).toBeUndefined();
      });
    });
    describe('otherwise', () => {
      it('should return delay (ms)', () => {
        untypedServer.options = {};
        untypedServer.isManuallyClosed = false;
        untypedServer.options.retryAttempts = 3;
        untypedServer.options.retryDelay = 3;
        const result = server.createRetryStrategy(2);
        expect(result).toEqual(untypedServer.options.retryDelay);
      });
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
});
