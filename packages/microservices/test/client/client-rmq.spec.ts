import { EventEmitter } from 'events';
import { EMPTY } from 'rxjs';
import { ClientRMQ } from '../../client/client-rmq.js';
import { ReadPacket } from '../../interfaces/index.js';
import { RmqRecord } from '../../record-builders/index.js';

describe('ClientRMQ', function () {
  let client: ClientRMQ;
  let untypedClient: any;

  describe('connect', () => {
    let createClientStub: ReturnType<typeof vi.fn>;
    let registerErrorListenerSpy: ReturnType<typeof vi.fn>;
    let connect$Stub: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      client = new ClientRMQ({});
      untypedClient = client as any;

      createClientStub = vi
        .spyOn(client, 'createClient')
        .mockImplementation(() => ({
          addListener: () => ({}),
          removeListener: () => ({}),
        }));
      registerErrorListenerSpy = vi.spyOn(client, 'registerErrorListener');
      connect$Stub = vi
        .spyOn(client, 'connect$' as any)
        .mockImplementation(() => ({
          subscribe: resolve => resolve(),
          toPromise() {
            return this;
          },
          pipe() {
            return this;
          },
        }));
      vi.spyOn(client, 'mergeDisconnectEvent').mockImplementation(
        (_, source) => source,
      );
    });
    describe('when is not connected', () => {
      beforeEach(async () => {
        try {
          client['client'] = null;
          await client.connect();
        } catch {
          // Ignore
        }
      });
      it('should call "registerErrorListener" once', async () => {
        expect(registerErrorListenerSpy).toHaveBeenCalled();
      });
      it('should call "createClient" once', async () => {
        expect(createClientStub).toHaveBeenCalled();
      });
      it('should call "connect$" once', async () => {
        expect(connect$Stub).toHaveBeenCalled();
      });
    });
    describe('when is connected', () => {
      beforeEach(() => {
        client['client'] = { test: true } as any;
        client['channel'] = { test: true };
      });
      it('should not call "createClient"', () => {
        expect(createClientStub).not.toHaveBeenCalled();
      });
      it('should not call "registerErrorListener"', () => {
        expect(registerErrorListenerSpy).not.toHaveBeenCalled();
      });
      it('should not call "connect$"', () => {
        expect(connect$Stub).not.toHaveBeenCalled();
      });
    });
  });

  describe('createChannel', () => {
    let createChannelStub: ReturnType<typeof vi.fn>;
    let setupChannelStub: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      setupChannelStub = vi
        .spyOn(client, 'setupChannel')
        .mockImplementation((_, done) => done());
      createChannelStub = vi.fn().mockImplementation(({ setup }) => setup());
      client['client'] = { createChannel: createChannelStub };
    });
    afterEach(() => {
      setupChannelStub.mockRestore();
    });
    it('should call "createChannel" method of the client instance', async () => {
      await client.createChannel();
      expect(createChannelStub).toHaveBeenCalled();
    });
    it('should call "setupChannel" method of the client instance', async () => {
      await client.createChannel();
      expect(setupChannelStub).toHaveBeenCalled();
    });
  });

  describe('consumeChannel', () => {
    let consumeStub: ReturnType<typeof vi.fn>;
    const channel: any = {};

    beforeEach(() => {
      client['responseEmitter'] = new EventEmitter();
      consumeStub = vi
        .fn()
        .mockImplementation((_, done) =>
          done({ properties: { correlationId: 1 } }),
        );

      channel.consume = consumeStub;
    });
    it('should call "consume" method of the channel instance', async () => {
      await client.consumeChannel(channel);
      expect(consumeStub).toHaveBeenCalled();
    });
  });

  describe('setupChannel', () => {
    const queue = 'test';
    const exchange = 'test.exchange';
    const queueOptions = {};
    const isGlobalPrefetchCount = true;
    const prefetchCount = 10;

    let consumeStub: ReturnType<typeof vi.fn>;
    let channel: any = {};

    beforeEach(() => {
      client['queue'] = queue;
      client['queueOptions'] = queueOptions;
      untypedClient['options'] = { isGlobalPrefetchCount, prefetchCount };

      channel = {
        assertQueue: vi.fn(),
        prefetch: vi.fn(),
        bindQueue: vi.fn(),
        assertExchange: vi.fn(),
      };
      consumeStub = vi
        .spyOn(client, 'consumeChannel')
        .mockImplementation(() => null!);
    });
    afterEach(() => {
      consumeStub.mockRestore();
    });
    it('should call "assertQueue" with queue and queue options when noAssert is false', async () => {
      client['noAssert'] = false;

      await client.setupChannel(channel, () => null);
      expect(channel.assertQueue).toHaveBeenCalledWith(queue, queueOptions);
    });
    it('should not call "assertQueue" when noAssert is true', async () => {
      client['noAssert'] = true;

      await client.setupChannel(channel, () => null);
      expect(channel.assertQueue).not.toHaveBeenCalled();
    });
    it('should not call "assertQueue" when exchangeType is fanout', async () => {
      untypedClient['options']['exchangeType'] = 'fanout';
      untypedClient['options']['exchange'] = exchange;
      await client.setupChannel(channel, () => null);
      expect(channel.assertQueue).not.toHaveBeenCalled();
    });
    it('should not call "assertQueue" when wildcards is true', async () => {
      untypedClient['options']['wildcards'] = true;
      await client.setupChannel(channel, () => null);
      expect(channel.assertQueue).not.toHaveBeenCalled();
    });
    it('should not call "bindQueue" when exchangeType is fanout', async () => {
      untypedClient['options']['exchangeType'] = 'fanout';
      untypedClient['options']['exchange'] = exchange;
      await client.setupChannel(channel, () => null);
      expect(channel.bindQueue).not.toHaveBeenCalled();
    });
    it('should not call "bindQueue" when wildcards is true', async () => {
      untypedClient['options']['wildcards'] = true;
      await client.setupChannel(channel, () => null);
      expect(channel.bindQueue).not.toHaveBeenCalled();
    });
    it('should call "prefetch" with prefetchCount and "isGlobalPrefetchCount"', async () => {
      await client.setupChannel(channel, () => null);
      expect(channel.prefetch).toHaveBeenCalledWith(
        prefetchCount,
        isGlobalPrefetchCount,
      );
    });
    it('should call "consumeChannel" method', async () => {
      await client.setupChannel(channel, () => null);
      expect(consumeStub).toHaveBeenCalled();
    });
    it('should call "resolve" function', async () => {
      const resolve = vi.fn();
      await client.setupChannel(channel, resolve);
      expect(resolve).toHaveBeenCalled();
    });
  });

  describe('mergeDisconnectEvent', () => {
    it('should merge disconnect event', () => {
      const error = new Error();
      const instance: any = {
        on: (ev, callback) => callback(error),
        off: () => ({}),
      };
      client
        .mergeDisconnectEvent(instance, EMPTY)
        .subscribe({ error: (err: any) => expect(err).toEqual(error) });
    });
  });

  describe('publish', () => {
    const pattern = 'test';
    const exchange = 'test.exchange';
    let msg: ReadPacket;
    let connectSpy: ReturnType<typeof vi.fn>,
      sendToQueueStub: ReturnType<typeof vi.fn>,
      publishStub: ReturnType<typeof vi.fn>,
      eventSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      client = new ClientRMQ({});
      untypedClient = client as any;

      msg = { pattern, data: 'data' };
      connectSpy = vi.spyOn(client, 'connect');
      eventSpy = vi.fn();
      sendToQueueStub = vi.fn().mockImplementation(() => ({ catch: vi.fn() }));
      publishStub = vi.fn().mockImplementation(() => ({ catch: vi.fn() }));

      client['channel'] = {
        sendToQueue: sendToQueueStub,
        publish: publishStub,
      };
      client['responseEmitter'] = new EventEmitter();
      client['responseEmitter'].on(pattern, eventSpy);
    });

    afterEach(() => {
      connectSpy.mockRestore();
    });

    it('should send message to a proper queue', () => {
      client['publish'](msg, () => {
        expect(sendToQueueStub).toHaveBeenCalled();
        expect(sendToQueueStub.mock.calls[0][0]).toEqual(client['queue']);
      });
    });
    it('should send message to exchange when exchangeType is fanout', async () => {
      untypedClient['options']['exchangeType'] = 'fanout';
      untypedClient['options']['exchange'] = exchange;
      client['publish'](msg, () => {
        expect(publishStub).toHaveBeenCalled();
        expect(publishStub.mock.calls[0][0]).toEqual(exchange);
      });
    });

    it('should send buffer from stringified message', () => {
      client['publish'](msg, () => {
        expect(sendToQueueStub).toHaveBeenCalled();
        expect(sendToQueueStub.mock.calls[1][1]).toEqual(
          Buffer.from(JSON.stringify(msg)),
        );
      });
    });

    describe('dispose callback', () => {
      let unsubscribeSpy: ReturnType<typeof vi.fn>, subscription;

      beforeEach(async () => {
        unsubscribeSpy = vi.fn();
        client['responseEmitter'] = {
          removeListener: unsubscribeSpy,
          on: vi.fn(),
        } as any as EventEmitter;

        subscription = client['publish'](msg, vi.fn());
        subscription();
      });
      it('should unsubscribe', () => {
        expect(unsubscribeSpy).toHaveBeenCalled();
      });
    });

    describe('headers', () => {
      it('should not generate headers if none are configured', () => {
        client['publish'](msg, () => {
          expect(sendToQueueStub.mock.calls[0][2].headers).toBeUndefined();
        });
      });

      it('should send packet headers', () => {
        const requestHeaders = { '1': '123' };
        msg.data = new RmqRecord('data', { headers: requestHeaders });

        client['publish'](msg, () => {
          expect(sendToQueueStub.mock.calls[0][2].headers).toEqual(
            requestHeaders,
          );
        });
      });

      it('should combine packet and static headers', () => {
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = { '1': '123' };
        msg.data = new RmqRecord('data', { headers: requestHeaders });

        client['publish'](msg, () => {
          expect(sendToQueueStub.mock.calls[0][2].headers).toEqual({
            ...staticHeaders,
            ...requestHeaders,
          });
        });
      });

      it('should prefer packet headers over static headers', () => {
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = { 'client-id': 'override-client-id' };
        msg.data = new RmqRecord('data', { headers: requestHeaders });

        client['publish'](msg, () => {
          expect(sendToQueueStub.mock.calls[0][2].headers).toEqual(
            requestHeaders,
          );
        });
      });
    });
  });

  describe('handleMessage', () => {
    describe('when error', () => {
      let callback: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        callback = vi.fn();
      });
      it('should call callback with correct object', async () => {
        const packet = {
          err: true,
          response: 'test',
          isDisposed: false,
        };
        await client.handleMessage(packet, callback);
        expect(callback).toHaveBeenCalledWith({
          err: packet.err,
          response: 'test',
          isDisposed: true,
        });
      });
    });
    describe('when disposed', () => {
      let callback: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        callback = vi.fn();
      });
      it('should call callback with correct object', async () => {
        const packet = {
          response: 'test',
          isDisposed: true,
        };
        await client.handleMessage(packet, callback);
        expect(callback).toHaveBeenCalledWith({
          err: undefined,
          response: 'test',
          isDisposed: true,
        });
      });
    });

    describe('when response', () => {
      let callback: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        callback = vi.fn();
      });
      it('should call callback with correct object', async () => {
        const packet = {
          response: 'test',
          isDisposed: false,
        };
        await client.handleMessage(packet, callback);
        expect(callback).toHaveBeenCalledWith({
          err: undefined,
          response: packet.response,
        });
      });
    });
  });

  describe('close', () => {
    let channelCloseSpy: ReturnType<typeof vi.fn>;
    let clientCloseSpy: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      channelCloseSpy = vi.fn();
      clientCloseSpy = vi.fn();
      untypedClient.channel = { close: channelCloseSpy };
      untypedClient.client = { close: clientCloseSpy };
    });

    it('should close channel when it is not null', async () => {
      await client.close();
      expect(channelCloseSpy).toHaveBeenCalled();
    });

    it('should close client when it is not null', async () => {
      await client.close();
      expect(clientCloseSpy).toHaveBeenCalled();
    });
  });
  describe('dispatchEvent', () => {
    let msg: ReadPacket;
    const exchange = 'test.exchange';
    let sendToQueueStub: ReturnType<typeof vi.fn>,
      publishStub: ReturnType<typeof vi.fn>,
      channel;

    beforeEach(() => {
      client = new ClientRMQ({});
      untypedClient = client as any;

      msg = { pattern: 'pattern', data: 'data' };
      sendToQueueStub = vi.fn();
      publishStub = vi.fn();
      channel = {
        sendToQueue: sendToQueueStub,
        publish: publishStub,
      };
      untypedClient.channel = channel;
    });

    it('should publish packet', async () => {
      sendToQueueStub.mockImplementation((a, b, c, d) => d());
      await client['dispatchEvent'](msg);

      expect(sendToQueueStub).toHaveBeenCalled();
    });
    it('should publish packet to exchange when exchangeType is fanout', async () => {
      untypedClient['options']['exchangeType'] = 'fanout';
      untypedClient['options']['exchange'] = exchange;
      publishStub.mockImplementation((a, b, c, d, f) => f());
      await client['dispatchEvent'](msg);

      expect(publishStub).toHaveBeenCalled();
      expect(publishStub.mock.calls[0][0]).toEqual(exchange);
    });
    it('should throw error', async () => {
      sendToQueueStub.mockImplementation((a, b, c, d) => d(new Error()));
      client['dispatchEvent'](msg).catch(err =>
        expect(err).toBeInstanceOf(Error),
      );
    });

    describe('headers', () => {
      it('should not generate headers if none are configured', async () => {
        sendToQueueStub.mockImplementation((a, b, c, d) => d());
        await client['dispatchEvent'](msg);
        expect(sendToQueueStub.mock.calls[0][2].headers).toBeUndefined();
      });

      it('should send packet headers', async () => {
        sendToQueueStub.mockImplementation((a, b, c, d) => d());
        const requestHeaders = { '1': '123' };
        msg.data = new RmqRecord('data', { headers: requestHeaders });

        await client['dispatchEvent'](msg);
        expect(sendToQueueStub.mock.calls[0][2].headers).toEqual(
          requestHeaders,
        );
      });

      it('should combine packet and static headers', async () => {
        sendToQueueStub.mockImplementation((a, b, c, d) => d());
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = { '1': '123' };
        msg.data = new RmqRecord('data', { headers: requestHeaders });

        await client['dispatchEvent'](msg);
        expect(sendToQueueStub.mock.calls[0][2].headers).toEqual({
          ...staticHeaders,
          ...requestHeaders,
        });
      });

      it('should prefer packet headers over static headers', async () => {
        sendToQueueStub.mockImplementation((a, b, c, d) => d());
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = { 'client-id': 'override-client-id' };
        msg.data = new RmqRecord('data', { headers: requestHeaders });

        await client['dispatchEvent'](msg);
        expect(sendToQueueStub.mock.calls[0][2].headers).toEqual(
          requestHeaders,
        );
      });
    });
  });
});
