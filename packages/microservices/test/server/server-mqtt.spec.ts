import { EventEmitter } from 'events';
import { of } from 'rxjs';
import { NO_MESSAGE_HANDLER } from '../../constants.js';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context.js';
import { MqttContext } from '../../ctx-host/index.js';
import { ServerMqtt } from '../../server/server-mqtt.js';
import { objectToMap } from './utils/object-to-map.js';

describe('ServerMqtt', () => {
  let server: ServerMqtt;
  let untypedServer: any;

  beforeEach(() => {
    server = new ServerMqtt({});
    untypedServer = server as any;
  });
  describe('listen', () => {
    let onSpy: ReturnType<typeof vi.fn>;
    let onceSpy: ReturnType<typeof vi.fn>;
    let client: any;
    let callbackSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onSpy = vi.fn();
      onceSpy = vi.fn();
      client = {
        on: onSpy,
        once: onceSpy,
      };
      vi.spyOn(server, 'createMqttClient').mockImplementation(() => client);
      callbackSpy = vi.fn();
    });
    it('should bind "error" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onSpy.mock.calls[0][0]).toBe('error');
    });
    it('should bind "reconnect" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onSpy.mock.calls[1][0]).toBe('reconnect');
    });
    it('should bind "disconnect" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onSpy.mock.calls[2][0]).toBe('disconnect');
    });
    it('should bind "close" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onSpy.mock.calls[3][0]).toBe('close');
    });
    it('should bind "connect" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onSpy.mock.calls[4][0]).toBe('connect');
    });
    it('should bind "message" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onSpy.mock.calls[5][0]).toBe('message');
    });
    it('should route "handleMessage" rejections to "handleError" instead of leaving them unhandled', async () => {
      const error = new Error('unexpected');
      vi.spyOn(server, 'handleMessage').mockRejectedValue(error);
      const handleErrorSpy = vi
        .spyOn(untypedServer, 'handleError')
        .mockImplementation(() => undefined);

      await server.listen(callbackSpy);
      const [, onMessage] = onSpy.mock.calls.find(
        ([event]) => event === 'message',
      )!;
      await onMessage('topic', Buffer.from('{}'));

      expect(handleErrorSpy).toHaveBeenCalledWith(error);
    });
    it('should bind the callback with "once"', async () => {
      await server.listen(callbackSpy);

      expect(onceSpy).toHaveBeenCalledWith('connect', expect.any(Function));
    });
    it('should run the callback once, as mqtt reconnects on the same client', async () => {
      // A real emitter, because mqtt re-emits "connect" on the same client
      // after every reconnect.
      const emitter: any = new EventEmitter();
      vi.spyOn(server, 'createMqttClient').mockImplementation(() => emitter);

      await server.listen(callbackSpy);
      emitter.emit('connect');
      emitter.emit('connect');
      emitter.emit('connect');

      expect(callbackSpy).toHaveBeenCalledExactlyOnceWith();
    });
    describe('when "maxConnectionAttempts" is configured', () => {
      let emitter: any;
      let endSpy: ReturnType<typeof vi.fn>;
      let serverWithOptions: ServerMqtt;
      let callbackSpy: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        emitter = new EventEmitter();
        endSpy = vi.fn();
        emitter.end = endSpy;
        serverWithOptions = new ServerMqtt({
          maxConnectionAttempts: 2,
        } as any);
        vi.spyOn(serverWithOptions, 'createMqttClient').mockImplementation(
          () => emitter,
        );
        callbackSpy = vi.fn();
      });

      it('should not call the callback when the error limit is not reached', async () => {
        await serverWithOptions.listen(callbackSpy);
        emitter.emit('error', new Error('first failure'));

        expect(callbackSpy).not.toHaveBeenCalled();
        expect(endSpy).not.toHaveBeenCalled();
      });

      it('should close the client and report the failure once the limit is reached', async () => {
        const error = new Error('second failure');

        await serverWithOptions.listen(callbackSpy);
        emitter.emit('error', new Error('first failure'));
        emitter.emit('error', error);

        expect(endSpy).toHaveBeenCalledOnce();
        expect(callbackSpy).toHaveBeenCalledExactlyOnceWith(error);
      });

      it('should not call the callback twice when the connection succeeds first', async () => {
        await serverWithOptions.listen(callbackSpy);
        emitter.emit('connect');
        emitter.emit('error', new Error('post-connect failure'));
        emitter.emit('error', new Error('post-connect failure'));

        expect(callbackSpy).toHaveBeenCalledExactlyOnceWith();
      });

      it('should not close the client when errors occur after a successful connection', async () => {
        await serverWithOptions.listen(callbackSpy);
        emitter.emit('connect');
        emitter.emit('error', new Error('first runtime failure'));
        emitter.emit('error', new Error('second runtime failure'));
        emitter.emit('error', new Error('third runtime failure'));

        expect(endSpy).not.toHaveBeenCalled();
      });

      it('should apply the limit again when the server is restarted', async () => {
        await serverWithOptions.listen(callbackSpy);
        emitter.emit('connect');
        serverWithOptions.close();

        const restartEmitter: any = new EventEmitter();
        restartEmitter.end = vi.fn();
        vi.spyOn(serverWithOptions, 'createMqttClient').mockImplementation(
          () => restartEmitter,
        );
        const restartCallbackSpy = vi.fn();

        await serverWithOptions.listen(restartCallbackSpy);
        restartEmitter.emit('error', new Error('first failure'));
        restartEmitter.emit('error', new Error('second failure'));

        expect(restartEmitter.end).toHaveBeenCalledOnce();
        expect(restartCallbackSpy).toHaveBeenCalledOnce();
      });

      it('should keep retrying when maxConnectionAttempts is not set', async () => {
        const serverWithoutLimit = new ServerMqtt({} as any);
        vi.spyOn(serverWithoutLimit, 'createMqttClient').mockImplementation(
          () => emitter,
        );

        await serverWithoutLimit.listen(callbackSpy);
        emitter.emit('error', new Error('failure'));

        expect(callbackSpy).not.toHaveBeenCalled();
        expect(endSpy).not.toHaveBeenCalled();
      });
    });
    describe('when "start" throws an exception', () => {
      it('should call callback with a thrown error as an argument', async () => {
        const error = new Error('random error');

        vi.spyOn(server, 'start').mockImplementation(() => {
          throw error;
        });
        await server.listen(callbackSpy);
        expect(callbackSpy).toHaveBeenCalledWith(error);
      });
    });
  });
  describe('close', () => {
    const mqttClient = { end: vi.fn() };
    beforeEach(() => {
      untypedServer.mqttClient = mqttClient;
    });
    it('should end mqttClient', () => {
      server.close();
      expect(mqttClient.end).toHaveBeenCalled();
    });
  });
  describe('bindEvents', () => {
    let onSpy: ReturnType<typeof vi.fn>,
      subscribeSpy: ReturnType<typeof vi.fn>,
      mqttClient;

    beforeEach(() => {
      onSpy = vi.fn();
      subscribeSpy = vi.fn();
      mqttClient = {
        on: onSpy,
        subscribe: subscribeSpy,
      };
    });
    it('should subscribe to each pattern', () => {
      const pattern = 'test';
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [pattern]: handler,
      });
      server.bindEvents(mqttClient);
      expect(subscribeSpy).toHaveBeenCalledWith(pattern, undefined);
    });

    describe('per-handler QoS via extras.qos', () => {
      it('should use extras.qos=2 when handler specifies qos 2', () => {
        const pattern = 'alerts/critical';
        const handler = Object.assign(vi.fn(), { extras: { qos: 2 } });
        untypedServer.messageHandlers = objectToMap({
          [pattern]: handler,
        });
        server.bindEvents(mqttClient);
        expect(subscribeSpy).toHaveBeenCalledOnce();
        expect(subscribeSpy.mock.calls[0][0]).toBe(pattern);
        expect(subscribeSpy.mock.calls[0][1]).toEqual({ qos: 2 });
      });

      it('should use extras.qos=0 when handler specifies qos 0', () => {
        const pattern = 'telemetry/data';
        const handler = Object.assign(vi.fn(), { extras: { qos: 0 } });
        untypedServer.messageHandlers = objectToMap({
          [pattern]: handler,
        });
        server.bindEvents(mqttClient);
        expect(subscribeSpy).toHaveBeenCalledOnce();
        expect(subscribeSpy.mock.calls[0][0]).toBe(pattern);
        expect(subscribeSpy.mock.calls[0][1]).toEqual({ qos: 0 });
      });

      it('should use global subscribeOptions when extras.qos is undefined', () => {
        const globalQos = 1;
        const serverWithOptions = new ServerMqtt({
          subscribeOptions: { qos: globalQos },
        });
        const untypedServerWithOptions = serverWithOptions as any;
        const pattern = 'events/general';
        const handler = Object.assign(vi.fn(), { extras: {} });
        untypedServerWithOptions.messageHandlers = objectToMap({
          [pattern]: handler,
        });
        serverWithOptions.bindEvents(mqttClient);
        expect(subscribeSpy).toHaveBeenCalledOnce();
        expect(subscribeSpy.mock.calls[0][0]).toBe(pattern);
        expect(subscribeSpy.mock.calls[0][1]).toEqual({
          qos: globalQos,
        });
      });

      it('should override only qos while preserving other global subscribeOptions', () => {
        const serverWithOptions = new ServerMqtt({
          subscribeOptions: { qos: 1, nl: true, rap: false },
        });
        const untypedServerWithOptions = serverWithOptions as any;
        const pattern = 'commands/run';
        const handler = Object.assign(vi.fn(), { extras: { qos: 2 } });
        untypedServerWithOptions.messageHandlers = objectToMap({
          [pattern]: handler,
        });
        serverWithOptions.bindEvents(mqttClient);
        expect(subscribeSpy).toHaveBeenCalledOnce();
        expect(subscribeSpy.mock.calls[0][1]).toEqual({
          qos: 2,
          nl: true,
          rap: false,
        });
      });

      it('should apply different qos per handler when multiple handlers exist', () => {
        const serverWithOptions = new ServerMqtt({
          subscribeOptions: { qos: 1 },
        });
        const untypedServerWithOptions = serverWithOptions as any;

        const handler0 = Object.assign(vi.fn(), { extras: { qos: 0 } });
        const handler1 = Object.assign(vi.fn(), { extras: {} });
        const handler2 = Object.assign(vi.fn(), { extras: { qos: 2 } });

        untypedServerWithOptions.messageHandlers = objectToMap({
          'telemetry/+': handler0,
          'events/#': handler1,
          'alerts/critical': handler2,
        });

        serverWithOptions.bindEvents(mqttClient);

        expect(subscribeSpy).toHaveBeenCalledTimes(3);

        const calls = subscribeSpy.mock.calls;
        const callMap = new Map(calls.map(c => [c[0], c[1]]));

        expect(callMap.get('telemetry/+')).toEqual({ qos: 0 });
        expect(callMap.get('events/#')).toEqual({ qos: 1 });
        expect(callMap.get('alerts/critical')).toEqual({ qos: 2 });
      });
    });
  });
  describe('getMessageHandler', () => {
    it(`should return function`, () => {
      expect(typeof server.getMessageHandler(untypedServer.mqttClient)).toEqual(
        'function',
      );
    });
    describe('handler', () => {
      it('should call "handleMessage"', async () => {
        const handleMessageStub = vi
          .spyOn(server, 'handleMessage')
          .mockResolvedValue(undefined as any);
        await server.getMessageHandler(untypedServer.mqttClient)(
          null!,
          null!,
          null!,
        );
        expect(handleMessageStub).toHaveBeenCalled();
      });
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
      await server.handleMessage(
        channel,
        Buffer.from(JSON.stringify({ pattern: '', data })),
        null,
      );
      expect(handleEventSpy).toHaveBeenCalled();
    });
    it(`should publish NO_MESSAGE_HANDLER if pattern not exists in messageHandlers object`, async () => {
      await server.handleMessage(
        channel,
        Buffer.from(JSON.stringify({ id, pattern: '', data })),
        null,
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

      await server.handleMessage(
        channel,
        Buffer.from(JSON.stringify({ pattern: '', data, id: '2' })),
        null,
      );
      expect(handler).toHaveBeenCalledWith(data, expect.any(MqttContext));
    });
  });

  describe('processing end hook', () => {
    const channel = 'test';
    const id = '3';
    let publishSpy: ReturnType<typeof vi.fn>;
    let endHook: ReturnType<typeof vi.fn>;

    const bindHandler = (handler: () => unknown) => {
      publishSpy = vi.fn();
      vi.spyOn(server, 'getPublisher').mockImplementation(() => publishSpy);
      endHook = vi.fn();
      untypedServer.onProcessingStartHook = (
        _transportId: unknown,
        _ctx: unknown,
        fn: () => Promise<void>,
      ) => fn();
      untypedServer.onProcessingEndHook = endHook;
      untypedServer.messageHandlers = objectToMap({
        [channel]: (async () => handler()) as any,
      });
    };
    const handleMessage = () =>
      server.handleMessage(
        channel,
        Buffer.from(JSON.stringify({ id, pattern: channel, data: 'test' })),
        null!,
      );
    const flush = () => new Promise(resolve => setImmediate(resolve));

    it('should run the hook once when the response stream emits several values', async () => {
      bindHandler(() => of('first', 'second', 'third'));

      await handleMessage();
      await flush();

      expect(publishSpy).toHaveBeenCalledTimes(3);
      expect(endHook).toHaveBeenCalledOnce();
    });
    it('should run the hook when the handler rejects', async () => {
      bindHandler(() => {
        throw new Error('handler failed');
      });

      await expect(handleMessage()).rejects.toThrow('handler failed');

      expect(endHook).toHaveBeenCalledOnce();
    });
  });
  describe('getPublisher', () => {
    let publisherSpy: ReturnType<typeof vi.fn>;
    let pub, publisher;

    const id = '1';
    const pattern = 'test';
    const context = new MqttContext([pattern, {}]);

    beforeEach(() => {
      publisherSpy = vi.fn();
      pub = {
        publish: publisherSpy,
      };
      publisher = server.getPublisher(pub, context, id);
    });
    it(`should return function`, () => {
      expect(typeof server.getPublisher(null, context, id)).toEqual('function');
    });
    it(`should call "publish" with expected arguments`, () => {
      const respond = 'test';
      publisher({ respond, id });
      expect(publisherSpy).toHaveBeenCalledWith(
        `${pattern}/reply`,
        JSON.stringify({ respond, id }),
        {},
      );
    });
  });
  describe('getRequestPattern', () => {
    const test = 'test';
    it(`should leave pattern as it is`, () => {
      expect(server.getRequestPattern(test)).toBe(test);
    });
  });
  describe('getReplyPattern', () => {
    const test = 'test';
    it(`should append "/reply" to string`, () => {
      const expectedResult = test + '/reply';
      expect(server.getReplyPattern(test)).toBe(expectedResult);
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
  describe('matchMqttPattern', () => {
    it('should return true when topic matches with provided pattern', () => {
      expect(server.matchMqttPattern('root/valid/+', 'root/valid/child')).toBe(
        true,
      );
      expect(server.matchMqttPattern('root/valid/#', 'root/valid/child')).toBe(
        true,
      );
      expect(
        server.matchMqttPattern('root/valid/#', 'root/valid/child/grandchild'),
      ).toBe(true);
      expect(server.matchMqttPattern('root/+/child', 'root/valid/child')).toBe(
        true,
      );
    });

    it('should return false when topic does not matches with provided pattern', () => {
      expect(server.matchMqttPattern('root/test/+', 'root/invalid/child')).toBe(
        false,
      );
      expect(server.matchMqttPattern('root/test/#', 'root/invalid/child')).toBe(
        false,
      );
      expect(
        server.matchMqttPattern(
          'root/#/grandchild',
          'root/invalid/child/grandchild',
        ),
      ).toBe(false);
      expect(
        server.matchMqttPattern(
          'root/+/grandchild',
          'root/invalid/child/grandchild',
        ),
      ).toBe(false);
    });
  });
});
