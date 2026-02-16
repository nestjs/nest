import { headers as createHeaders } from '@nats-io/transport-node';
import { ClientNats } from '../../client/client-nats.js';
import { ReadPacket, WritePacket } from '../../interfaces/index.js';
import { NatsRecord } from '../../record-builders/index.js';

describe('ClientNats', () => {
  let client: ClientNats;
  let untypedClient: any;

  describe('publish', () => {
    let msg: ReadPacket;
    const pattern = 'test';
    const id = 3;

    let subscribeSpy: ReturnType<typeof vi.fn>,
      publishSpy: ReturnType<typeof vi.fn>,
      removeListenerSpy: ReturnType<typeof vi.fn>,
      unsubscribeSpy: ReturnType<typeof vi.fn>,
      connectSpy: ReturnType<typeof vi.fn>,
      natsClient: any,
      subscription: any,
      createClient: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      client = new ClientNats({});
      untypedClient = client as any;

      // Resolve the nats package (loaded asynchronously in constructor)
      await client.createClient().catch(() => {});

      msg = { pattern, data: 'data' };
      unsubscribeSpy = vi.fn();
      subscription = {
        unsubscribe: unsubscribeSpy,
      };
      subscribeSpy = vi.fn().mockReturnValue(subscription);
      publishSpy = vi.fn();
      removeListenerSpy = vi.fn();

      natsClient = {
        subscribe: subscribeSpy,
        removeListener: removeListenerSpy,
        addListener: () => ({}),
        publish: publishSpy,
      };
      untypedClient.natsClient = natsClient;

      connectSpy = vi.spyOn(client, 'connect').mockImplementation(async () => {
        untypedClient.natsClient = natsClient;
      });
      createClient = vi
        .spyOn(client, 'createClient')
        .mockImplementation(async () => untypedClient);
    });
    afterEach(() => {
      connectSpy.mockRestore();
      createClient.mockRestore();
    });
    it('should publish stringified message to pattern name', () => {
      client['publish'](msg, () => {});
      expect(publishSpy.mock.calls[0][0]).toEqual(pattern);
    });
    describe('on error', () => {
      let assignPacketIdStub: ReturnType<typeof vi.fn>;
      beforeEach(() => {
        assignPacketIdStub = vi
          .spyOn(client, 'assignPacketId' as any)
          .mockImplementation(() => {
            throw new Error();
          });
      });
      afterEach(() => {
        assignPacketIdStub.mockRestore();
      });

      it('should call callback', () => {
        const callback = vi.fn();
        client['publish'](msg, callback);

        expect(callback).toHaveBeenCalled();
        expect(callback.mock.calls[0][0].err).toBeInstanceOf(Error);
      });
    });
    describe('dispose callback', () => {
      let assignStub: ReturnType<typeof vi.fn>;
      let callback: ReturnType<typeof vi.fn>, subscription;

      beforeEach(async () => {
        callback = vi.fn();
        assignStub = vi
          .spyOn(client, 'assignPacketId' as any)
          .mockImplementation(packet =>
            Object.assign(packet as object, { id }),
          );

        subscription = client['publish'](
          msg,
          callback as (packet: WritePacket) => any,
        );
        subscription();
      });
      afterEach(() => {
        assignStub.mockRestore();
      });

      it('should unsubscribe', () => {
        expect(unsubscribeSpy).toHaveBeenCalled();
      });
    });

    describe('headers', () => {
      it('should not generate headers if none are configured', () => {
        client['publish'](msg, () => {});
        expect(natsClient.publish.mock.calls[0][2].headers).toBeUndefined();
      });

      it('should send packet headers', () => {
        const requestHeaders = createHeaders();
        requestHeaders.set('1', '123');
        msg.data = new NatsRecord('data', requestHeaders);

        client['publish'](msg, () => {});
        expect(natsClient.publish.mock.calls[0][2].headers.get('1')).toEqual(
          '123',
        );
      });
      it('should combine packet and static headers', () => {
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = createHeaders();
        requestHeaders.set('1', '123');
        msg.data = new NatsRecord('data', requestHeaders);

        client['publish'](msg, () => {});
        expect(publishSpy.mock.calls[0][2].headers.get('client-id')).toEqual(
          'some-client-id',
        );
        expect(publishSpy.mock.calls[0][2].headers.get('1')).toEqual('123');
      });

      it('should prefer packet headers over static headers', () => {
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = createHeaders();
        requestHeaders.set('client-id', 'override-client-id');
        msg.data = new NatsRecord('data', requestHeaders);

        client['publish'](msg, () => {});
        expect(publishSpy.mock.calls[0][2].headers.get('client-id')).toEqual(
          'override-client-id',
        );
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
      data: JSON.stringify(responseMessage),
      json: () => responseMessage,
    };

    let callback: ReturnType<typeof vi.fn>, subscription;

    describe('not completed', () => {
      beforeEach(async () => {
        callback = vi.fn();

        subscription = client.createSubscriptionHandler(
          msg,
          callback as (packet: WritePacket) => any,
        );
        await subscription(undefined, natsMessage);
      });
      it('should call callback with expected arguments', () => {
        expect(callback).toHaveBeenCalledWith({
          err: undefined,
          response: responseMessage.response,
        });
      });
    });
    describe('disposed and "id" is correct', () => {
      beforeEach(async () => {
        callback = vi.fn();
        subscription = client.createSubscriptionHandler(
          msg,
          callback as (packet: WritePacket) => any,
        );
        subscription(undefined, {
          data: JSON.stringify({
            ...responseMessage,
            isDisposed: true,
          }),
          json: function () {
            return JSON.parse(this.data);
          },
        });
      });

      it('should call callback with dispose param', () => {
        expect(callback).toHaveBeenCalledWith({
          isDisposed: true,
          response: responseMessage.response,
          err: undefined,
        });
      });
    });
    describe('disposed and "id" is incorrect', () => {
      beforeEach(async () => {
        callback = vi.fn();
        subscription = client.createSubscriptionHandler(
          {
            ...msg,
            id: '2',
          },
          callback as (packet: WritePacket) => any,
        );
        subscription(undefined, {
          data: JSON.stringify({
            ...responseMessage,
            isDisposed: true,
          }),
          json: function () {
            return JSON.parse(this.data);
          },
        });
      });

      it('should not call callback', () => {
        expect(callback).not.toHaveBeenCalled();
      });
    });
  });
  describe('close', () => {
    let natsClose: ReturnType<typeof vi.fn>;
    let natsClient: any;

    beforeEach(() => {
      natsClose = vi.fn();
      natsClient = { close: natsClose };
      untypedClient.natsClient = natsClient;
    });
    it('should close "natsClient" when it is not null', async () => {
      await client.close();
      expect(natsClose).toHaveBeenCalled();
    });
  });
  describe('connect', () => {
    let createClientSpy: ReturnType<typeof vi.fn>;
    let handleStatusUpdatesSpy: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      createClientSpy = vi
        .spyOn(client, 'createClient')
        .mockImplementation(() => Promise.resolve({}));
      handleStatusUpdatesSpy = vi.spyOn(client, 'handleStatusUpdates');

      await client.connect();
    });
    afterEach(() => {
      createClientSpy.mockRestore();
      handleStatusUpdatesSpy.mockRestore();
    });
    describe('when is not connected', () => {
      beforeEach(async () => {
        client['natsClient'] = null;
        client['connectionPromise'] = null;
        await client.connect();
      });
      it('should call "handleStatusUpdatesSpy" once', async () => {
        expect(handleStatusUpdatesSpy).toHaveBeenCalled();
      });
      it('should call "createClient" once', async () => {
        expect(createClientSpy).toHaveBeenCalled();
      });
    });
    describe('when is connected', () => {
      beforeEach(() => {
        client['natsClient'] = { test: true } as any;
        client['connection'] = Promise.resolve(true);
      });
      it('should not call "createClient"', () => {
        expect(createClientSpy).not.toHaveBeenCalled();
      });
      it('should not call "handleStatusUpdatesSpy"', () => {
        expect(handleStatusUpdatesSpy).not.toHaveBeenCalled();
      });
    });
  });
  describe('handleStatusUpdates', () => {
    it('should retrieve "status()" async iterator', () => {
      const clientMock = {
        status: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            // empty iterator
          },
        }),
      };
      void client.handleStatusUpdates(clientMock as any);
      expect(clientMock.status).toHaveBeenCalled();
    });

    it('should log "disconnect" and "error" statuses as "errors"', async () => {
      const logErrorSpy = vi.spyOn(untypedClient.logger, 'error');
      const clientMock = {
        status: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { type: 'disconnect' };
            yield { type: 'error', error: 'Test error' };
          },
        }),
      };
      await client.handleStatusUpdates(clientMock as any);
      expect(logErrorSpy).toHaveBeenCalledTimes(2);
      expect(logErrorSpy).toHaveBeenNthCalledWith(
        1,
        'NatsError: type: "disconnect".',
      );
      expect(logErrorSpy).toHaveBeenNthCalledWith(
        2,
        'NatsError: type: "error", error: "Test error".',
      );
    });
    it('should log other statuses as "logs"', async () => {
      const logSpy = vi.spyOn(untypedClient.logger, 'log');
      const clientMock = {
        status: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield { type: 'non-disconnect', data: 'localhost' };
            yield { type: 'warn', data: {} };
          },
        }),
      };
      await client.handleStatusUpdates(clientMock as any);
      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenCalledWith(
        'NatsStatus: type: "non-disconnect", data: "localhost".',
      );
      expect(logSpy).toHaveBeenCalledWith(
        'NatsStatus: type: "warn", data: "{}".',
      );
    });
  });
  describe('dispatchEvent', () => {
    let msg: ReadPacket;
    let subscribeStub: ReturnType<typeof vi.fn>, natsClient: any;

    beforeEach(async () => {
      client = new ClientNats({});
      untypedClient = client as any;

      // Resolve the nats package (loaded asynchronously in constructor)
      await client.createClient().catch(() => {});

      msg = { pattern: 'pattern', data: 'data' };
      subscribeStub = vi
        .fn()
        .mockImplementation((channel, options) => options.callback());
      natsClient = {
        publish: vi.fn(),
        subscribe: subscribeStub,
      };
      untypedClient.natsClient = natsClient;
    });

    it('should publish packet', async () => {
      await client['dispatchEvent'](msg);

      expect(natsClient.publish).toHaveBeenCalled();
    });

    it('should throw error', async () => {
      subscribeStub.mockImplementation((channel, options) =>
        options.callback(new Error()),
      );
      await client['dispatchEvent'](msg).catch(err =>
        expect(err).toBeInstanceOf(Error),
      );
    });

    describe('headers', () => {
      it('should not generate headers if none are configured', async () => {
        await client['dispatchEvent'](msg);
        expect(natsClient.publish.mock.calls[0][2].headers).toBeUndefined();
      });

      it('should send packet headers', async () => {
        const requestHeaders = createHeaders();
        requestHeaders.set('1', '123');
        msg.data = new NatsRecord('data', requestHeaders);

        await client['dispatchEvent'](msg);
        expect(natsClient.publish.mock.calls[0][2].headers.get('1')).toEqual(
          '123',
        );
      });

      it('should combine packet and static headers', async () => {
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = createHeaders();
        requestHeaders.set('1', '123');
        msg.data = new NatsRecord('data', requestHeaders);

        await client['dispatchEvent'](msg);
        expect(
          natsClient.publish.mock.calls[0][2].headers.get('client-id'),
        ).toEqual('some-client-id');
        expect(natsClient.publish.mock.calls[0][2].headers.get('1')).toEqual(
          '123',
        );
      });

      it('should prefer packet headers over static headers', async () => {
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = createHeaders();
        requestHeaders.set('client-id', 'override-client-id');
        msg.data = new NatsRecord('data', requestHeaders);

        await client['dispatchEvent'](msg);
        expect(
          natsClient.publish.mock.calls[0][2].headers.get('client-id'),
        ).toEqual('override-client-id');
      });
    });
  });
});
