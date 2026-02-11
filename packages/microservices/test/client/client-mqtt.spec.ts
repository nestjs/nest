import { EMPTY } from 'rxjs';
import { ClientMqtt } from '../../client/client-mqtt.js';
import { ReadPacket } from '../../interfaces/index.js';
import { MqttRecord } from '../../record-builders/index.js';

describe('ClientMqtt', () => {
  const test = 'test';
  let client: ClientMqtt = new ClientMqtt({});
  let untypedClient = client as any;

  describe('getRequestPattern', () => {
    it(`should leave pattern as it is`, () => {
      expect(client.getRequestPattern(test)).toBe(test);
    });
  });
  describe('getResponsePattern', () => {
    it(`should append "/reply" to string`, () => {
      const expectedResult = test + '/reply';
      expect(client.getResponsePattern(test)).toBe(expectedResult);
    });
  });
  describe('publish', () => {
    const pattern = 'test';
    let msg: ReadPacket;
    let subscribeSpy: ReturnType<typeof vi.fn>,
      publishSpy: ReturnType<typeof vi.fn>,
      onSpy: ReturnType<typeof vi.fn>,
      removeListenerSpy: ReturnType<typeof vi.fn>,
      unsubscribeSpy: ReturnType<typeof vi.fn>,
      connectSpy: ReturnType<typeof vi.fn>,
      assignStub: ReturnType<typeof vi.fn>,
      mqttClient: any;

    const id = '1';
    beforeEach(() => {
      client = new ClientMqtt({});
      untypedClient = client as any;

      msg = { pattern, data: 'data' };
      subscribeSpy = vi.fn((name, fn) => fn());
      publishSpy = vi.fn();
      onSpy = vi.fn();
      removeListenerSpy = vi.fn();
      unsubscribeSpy = vi.fn();

      mqttClient = {
        subscribe: subscribeSpy,
        on: (type, handler) => (type === 'subscribe' ? handler() : onSpy()),
        removeListener: removeListenerSpy,
        unsubscribe: unsubscribeSpy,
        publish: publishSpy,
        addListener: () => ({}),
      };
      untypedClient.mqttClient = mqttClient;
      connectSpy = vi
        .spyOn(client, 'connect')
        .mockImplementation(() => ({}) as any);
      assignStub = vi
        .spyOn(client, 'assignPacketId' as any)
        .mockImplementation(packet => Object.assign(packet as object, { id }));
    });
    afterEach(() => {
      connectSpy.mockRestore();
      assignStub.mockRestore();
    });
    it('should subscribe to response pattern name', async () => {
      client['publish'](msg, () => {});
      expect(subscribeSpy.mock.calls[0][0]).toEqual(`${pattern}/reply`);
    });
    it('should publish stringified message to request pattern name', async () => {
      client['publish'](msg, () => {});
      expect(publishSpy.mock.calls[0][0]).toEqual(pattern);
      expect(publishSpy.mock.calls[0][1]).toEqual(JSON.stringify(msg));
    });
    it('should add callback to routing map', async () => {
      client['publish'](msg, () => {});
      expect(client['routingMap'].has(id)).toBe(true);
    });
    describe('on error', () => {
      beforeEach(() => {
        assignStub.mockImplementation(() => {
          throw new Error();
        });
      });

      it('should call callback', () => {
        const callback = vi.fn();
        client['publish'](msg, callback);

        expect(callback).toHaveBeenCalled();
        expect(callback.mock.calls[0][0].err).toBeInstanceOf(Error);
      });
    });
    describe('dispose callback', () => {
      let getResponsePatternStub: ReturnType<typeof vi.fn>;
      let callback: ReturnType<typeof vi.fn>, subscription;

      const channel = 'channel';

      beforeEach(async () => {
        callback = vi.fn();

        getResponsePatternStub = vi
          .spyOn(client, 'getResponsePattern')
          .mockImplementation(() => channel);
        subscription = client['publish'](msg, callback);
        subscription(channel, JSON.stringify({ isDisposed: true, id }));
      });
      afterEach(() => {
        getResponsePatternStub.mockRestore();
      });

      it('should unsubscribe to response pattern name', () => {
        expect(unsubscribeSpy).toHaveBeenCalledWith(channel);
      });
      it('should remove callback from routing map', () => {
        expect(client['routingMap'].has(id)).toBe(false);
      });
    });
    describe('headers', () => {
      it('should not generate headers if none are configured', async () => {
        client['publish'](msg, () => {});
        expect(publishSpy.mock.calls[0][2]).toBeUndefined();
      });
      it('should send packet headers', async () => {
        const requestHeaders = { '1': '123' };
        msg.data = new MqttRecord('data', {
          properties: { userProperties: requestHeaders },
        });

        client['publish'](msg, () => {});
        expect(publishSpy.mock.calls[0][2].properties.userProperties).toEqual(
          requestHeaders,
        );
      });
      it('should combine packet and static headers', async () => {
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.userProperties = staticHeaders;

        const requestHeaders = { '1': '123' };
        msg.data = new MqttRecord('data', {
          properties: { userProperties: requestHeaders },
        });

        client['publish'](msg, () => {});
        expect(publishSpy.mock.calls[0][2].properties.userProperties).toEqual({
          ...staticHeaders,
          ...requestHeaders,
        });
      });
      it('should prefer packet headers over static headers', async () => {
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = { 'client-id': 'override-client-id' };
        msg.data = new MqttRecord('data', {
          properties: { userProperties: requestHeaders },
        });

        client['publish'](msg, () => {});
        expect(publishSpy.mock.calls[0][2].properties.userProperties).toEqual(
          requestHeaders,
        );
      });
    });
  });
  describe('createResponseCallback', () => {
    let callback: ReturnType<typeof vi.fn>, subscription;
    const responseMessage = {
      response: 'test',
      id: '1',
    };

    describe('not completed', () => {
      beforeEach(async () => {
        callback = vi.fn();
        subscription = client.createResponseCallback();

        client['routingMap'].set(responseMessage.id, callback);
        subscription('channel', Buffer.from(JSON.stringify(responseMessage)));
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
        subscription = client.createResponseCallback();

        client['routingMap'].set(responseMessage.id, callback);
        subscription(
          'channel',
          Buffer.from(
            JSON.stringify({
              ...responseMessage,
              isDisposed: true,
            }),
          ),
        );
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
        subscription = client.createResponseCallback();

        client['routingMap'].set('3', callback);
        subscription('channel', Buffer.from(JSON.stringify(responseMessage)));
      });

      it('should not call callback', () => {
        expect(callback).not.toHaveBeenCalled();
      });
    });
  });
  describe('close', () => {
    let endSpy: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      endSpy = vi.fn();
      untypedClient.mqttClient = { endAsync: endSpy };
    });
    it('should close "pub" when it is not null', async () => {
      await client.close();
      expect(endSpy).toHaveBeenCalled();
    });
    it('should not close "pub" when it is null', async () => {
      untypedClient.mqttClient = null;
      await client.close();
      expect(endSpy).not.toHaveBeenCalled();
    });
  });
  describe('connect', () => {
    let createClientStub: ReturnType<typeof vi.fn>;
    let registerErrorListenerSpy: ReturnType<typeof vi.fn>;
    let connect$Stub: ReturnType<typeof vi.fn>;
    let mergeCloseEvent: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      createClientStub = vi.spyOn(client, 'createClient').mockImplementation(
        () =>
          ({
            addListener: () => ({}),
            removeListener: () => ({}),
            on: () => ({}),
          }) as any,
      );
      registerErrorListenerSpy = vi.spyOn(client, 'registerErrorListener');
      connect$Stub = vi
        .spyOn(client, 'connect$' as any)
        .mockImplementation(() => ({
          subscribe: ({ complete }) => complete(),
          pipe() {
            return this;
          },
        }));
      mergeCloseEvent = vi
        .spyOn(client, 'mergeCloseEvent')
        .mockImplementation((_, source) => source);
    });
    afterEach(() => {
      createClientStub.mockRestore();
      registerErrorListenerSpy.mockRestore();
      connect$Stub.mockRestore();
      mergeCloseEvent.mockRestore();
    });
    describe('when is not connected', () => {
      beforeEach(async () => {
        client['mqttClient'] = null;
        await client.connect();
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
        client['mqttClient'] = { test: true } as any;
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
  describe('mergeCloseEvent', () => {
    it('should merge close event', () => {
      const error = new Error();
      const instance: any = {
        on: (ev, callback) => callback(error),
        off: () => ({}),
      };
      client.mergeCloseEvent(instance, EMPTY).subscribe({
        error: (err: any) => expect(err).toEqual(error),
      });
    });
  });
  describe('registerErrorListener', () => {
    it('should bind error event handler', () => {
      const callback = vi
        .fn()
        .mockImplementation((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerErrorListener(emitter as any);
      expect(callback.mock.calls[0][0]).toEqual('error');
    });
  });
  describe('registerConnectListener', () => {
    it('should bind connect event handler', () => {
      const callback = vi
        .fn()
        .mockImplementation((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerConnectListener(emitter as any);
      expect(callback.mock.calls[0][0]).toEqual('connect');
    });
  });
  describe('registerDisconnectListener', () => {
    it('should bind disconnect event handler', () => {
      const callback = vi
        .fn()
        .mockImplementation((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerDisconnectListener(emitter as any);
      expect(callback.mock.calls[0][0]).toEqual('disconnect');
    });
  });
  describe('registerOfflineListener', () => {
    it('should bind offline event handler', () => {
      const callback = vi
        .fn()
        .mockImplementation((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerOfflineListener(emitter as any);
      expect(callback.mock.calls[0][0]).toEqual('offline');
    });
  });
  describe('registerCloseListener', () => {
    it('should bind close event handler', () => {
      const callback = vi
        .fn()
        .mockImplementation((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerCloseListener(emitter as any);
      expect(callback.mock.calls[0][0]).toEqual('close');
    });
  });
  describe('dispatchEvent', () => {
    let msg: ReadPacket;
    let publishStub: ReturnType<typeof vi.fn>, mqttClient;

    beforeEach(() => {
      client = new ClientMqtt({});
      untypedClient = client as any;

      msg = { pattern: 'pattern', data: 'data' };
      publishStub = vi.fn();
      mqttClient = {
        publish: publishStub,
      };
      untypedClient.mqttClient = mqttClient;
    });

    it('should publish packet', async () => {
      publishStub.mockImplementation((a, b, c, d) => d());
      await client['dispatchEvent'](msg);

      expect(publishStub).toHaveBeenCalled();
    });
    it('should throw error', async () => {
      publishStub.mockImplementation((a, b, c, d) => d(new Error()));
      client['dispatchEvent'](msg).catch(err =>
        expect(err).toBeInstanceOf(Error),
      );
    });
    describe('headers', () => {
      it('should not generate headers if none are configured', async () => {
        publishStub.mockImplementation((a, b, c, d) => d());
        await client['dispatchEvent'](msg);
        expect(publishStub.mock.calls[0][2]).toBeUndefined();
      });
      it('should send packet headers', async () => {
        publishStub.mockImplementation((a, b, c, d) => d());
        const requestHeaders = { '1': '123' };
        msg.data = new MqttRecord('data', {
          properties: { userProperties: requestHeaders },
        });

        await client['dispatchEvent'](msg);
        expect(publishStub.mock.calls[0][2].properties.userProperties).toEqual(
          requestHeaders,
        );
      });
      it('should combine packet and static headers', async () => {
        publishStub.mockImplementation((a, b, c, d) => d());
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.userProperties = staticHeaders;

        const requestHeaders = { '1': '123' };
        msg.data = new MqttRecord('data', {
          properties: { userProperties: requestHeaders },
        });

        await client['dispatchEvent'](msg);
        expect(publishStub.mock.calls[0][2].properties.userProperties).toEqual({
          ...staticHeaders,
          ...requestHeaders,
        });
      });
      it('should prefer packet headers over static headers', async () => {
        publishStub.mockImplementation((a, b, c, d) => d());
        const staticHeaders = { 'client-id': 'some-client-id' };
        untypedClient.options.headers = staticHeaders;

        const requestHeaders = { 'client-id': 'override-client-id' };
        msg.data = new MqttRecord('data', {
          properties: { userProperties: requestHeaders },
        });

        await client['dispatchEvent'](msg);
        expect(publishStub.mock.calls[0][2].properties.userProperties).toEqual(
          requestHeaders,
        );
      });
    });
  });
});
