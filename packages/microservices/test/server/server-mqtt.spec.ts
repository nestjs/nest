import { expect } from 'chai';
import * as sinon from 'sinon';
import { MQTT_MAX_TOPIC_LENGTH, NO_MESSAGE_HANDLER } from '../../constants';
import { MqttContext } from '../../ctx-host';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context';
import { InvalidPacketIdException } from '../../errors/invalid-packet-id.exception';
import { MaxMqttTopicLengthExceededException } from '../../errors/max-mqtt-topic-length-exceeded.exception';
import { ServerMqtt } from '../../server/server-mqtt';
import { objectToMap } from './utils/object-to-map';

describe('ServerMqtt', () => {
  let server: ServerMqtt;
  let untypedServer: any;

  beforeEach(() => {
    server = new ServerMqtt({});
    untypedServer = server as any;
  });
  describe('listen', () => {
    let onSpy: sinon.SinonSpy;
    let client: any;
    let callbackSpy: sinon.SinonSpy;

    beforeEach(() => {
      onSpy = sinon.spy();
      client = {
        on: onSpy,
      };
      sinon.stub(server, 'createMqttClient').callsFake(() => client);
      callbackSpy = sinon.spy();
    });
    it('should bind "error" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onSpy.getCall(0).args[0]).to.be.equal('error');
    });
    it('should bind "reconnect" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onSpy.getCall(1).args[0]).to.be.equal('reconnect');
    });
    it('should bind "disconnect" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onSpy.getCall(2).args[0]).to.be.equal('disconnect');
    });
    it('should bind "close" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onSpy.getCall(3).args[0]).to.be.equal('close');
    });
    it('should bind "connect" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onSpy.getCall(4).args[0]).to.be.equal('connect');
    });
    it('should bind "message" event to handler', async () => {
      await server.listen(callbackSpy);
      expect(onSpy.getCall(5).args[0]).to.be.equal('message');
    });
    describe('when "start" throws an exception', () => {
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
    const mqttClient = { end: sinon.spy() };
    beforeEach(() => {
      untypedServer.mqttClient = mqttClient;
    });
    it('should end mqttClient', () => {
      server.close();
      expect(mqttClient.end.called).to.be.true;
    });
  });
  describe('bindEvents', () => {
    let onSpy: sinon.SinonSpy, subscribeSpy: sinon.SinonSpy, mqttClient;

    beforeEach(() => {
      onSpy = sinon.spy();
      subscribeSpy = sinon.spy();
      mqttClient = {
        on: onSpy,
        subscribe: subscribeSpy,
      };
    });
    it('should subscribe to each pattern', () => {
      const pattern = 'test';
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [pattern]: handler,
      });
      server.bindEvents(mqttClient);
      expect(subscribeSpy.calledWith(pattern)).to.be.true;
    });

    describe('per-handler QoS via extras.qos', () => {
      it('should use extras.qos=2 when handler specifies qos 2', () => {
        const pattern = 'alerts/critical';
        const handler = Object.assign(sinon.spy(), { extras: { qos: 2 } });
        untypedServer.messageHandlers = objectToMap({
          [pattern]: handler,
        });
        server.bindEvents(mqttClient);
        expect(subscribeSpy.calledOnce).to.be.true;
        expect(subscribeSpy.firstCall.args[0]).to.equal(pattern);
        expect(subscribeSpy.firstCall.args[1]).to.deep.equal({ qos: 2 });
      });

      it('should use extras.qos=0 when handler specifies qos 0', () => {
        const pattern = 'telemetry/data';
        const handler = Object.assign(sinon.spy(), { extras: { qos: 0 } });
        untypedServer.messageHandlers = objectToMap({
          [pattern]: handler,
        });
        server.bindEvents(mqttClient);
        expect(subscribeSpy.calledOnce).to.be.true;
        expect(subscribeSpy.firstCall.args[0]).to.equal(pattern);
        expect(subscribeSpy.firstCall.args[1]).to.deep.equal({ qos: 0 });
      });

      it('should use global subscribeOptions when extras.qos is undefined', () => {
        const globalQos = 1;
        const serverWithOptions = new ServerMqtt({
          subscribeOptions: { qos: globalQos },
        });
        const untypedServerWithOptions = serverWithOptions as any;
        const pattern = 'events/general';
        const handler = Object.assign(sinon.spy(), { extras: {} });
        untypedServerWithOptions.messageHandlers = objectToMap({
          [pattern]: handler,
        });
        serverWithOptions.bindEvents(mqttClient);
        expect(subscribeSpy.calledOnce).to.be.true;
        expect(subscribeSpy.firstCall.args[0]).to.equal(pattern);
        expect(subscribeSpy.firstCall.args[1]).to.deep.equal({
          qos: globalQos,
        });
      });

      it('should override only qos while preserving other global subscribeOptions', () => {
        const serverWithOptions = new ServerMqtt({
          subscribeOptions: { qos: 1, nl: true, rap: false },
        });
        const untypedServerWithOptions = serverWithOptions as any;
        const pattern = 'commands/run';
        const handler = Object.assign(sinon.spy(), { extras: { qos: 2 } });
        untypedServerWithOptions.messageHandlers = objectToMap({
          [pattern]: handler,
        });
        serverWithOptions.bindEvents(mqttClient);
        expect(subscribeSpy.calledOnce).to.be.true;
        expect(subscribeSpy.firstCall.args[1]).to.deep.equal({
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

        const handler0 = Object.assign(sinon.spy(), { extras: { qos: 0 } });
        const handler1 = Object.assign(sinon.spy(), { extras: {} });
        const handler2 = Object.assign(sinon.spy(), { extras: { qos: 2 } });

        untypedServerWithOptions.messageHandlers = objectToMap({
          'telemetry/+': handler0,
          'events/#': handler1,
          'alerts/critical': handler2,
        });

        serverWithOptions.bindEvents(mqttClient);

        expect(subscribeSpy.callCount).to.equal(3);

        const calls = subscribeSpy.getCalls();
        const callMap = new Map(calls.map(c => [c.args[0], c.args[1]]));

        expect(callMap.get('telemetry/+')).to.deep.equal({ qos: 0 });
        expect(callMap.get('events/#')).to.deep.equal({ qos: 1 });
        expect(callMap.get('alerts/critical')).to.deep.equal({ qos: 2 });
      });
    });
  });
  describe('getMessageHandler', () => {
    it(`should return function`, () => {
      expect(
        typeof server.getMessageHandler(untypedServer.mqttClient),
      ).to.be.eql('function');
    });
    describe('handler', () => {
      it('should call "handleMessage"', async () => {
        const handleMessageStub = sinon
          .stub(server, 'handleMessage')
          .resolves();
        await server.getMessageHandler(untypedServer.mqttClient)(
          null!,
          null!,
          null!,
        );
        expect(handleMessageStub.called).to.be.true;
      });
      it('should route "handleMessage" rejections to "handleError" instead of leaving them unhandled', async () => {
        const error = new Error('unexpected');
        sinon.stub(server, 'handleMessage').rejects(error);
        const handleErrorStub = sinon.stub(untypedServer, 'handleError');

        await server.getMessageHandler(untypedServer.mqttClient)(
          'topic',
          Buffer.from('{}'),
        );

        expect(handleErrorStub.calledWith(error)).to.be.true;
      });
      it('should neither run the handler nor reply when the reply topic would be too long', async () => {
        const handler = sinon.spy();
        const publish = sinon.spy();
        const loggerErrorStub = sinon.stub(untypedServer.logger, 'error');
        untypedServer.messageHandlers = objectToMap({ '#': handler });

        // The broker delivers topics up to the limit, "/reply" is added to it
        await server.getMessageHandler({ publish })(
          'a'.repeat(MQTT_MAX_TOPIC_LENGTH),
          Buffer.from(JSON.stringify({ id: '1', data: 'test' })),
        );
        await new Promise(resolve => setImmediate(resolve));

        expect(handler.called).to.be.false;
        expect(publish.called).to.be.false;
        expect(loggerErrorStub.calledOnce).to.be.true;
        expect(loggerErrorStub.firstCall.args[0]).to.be.instanceOf(
          MaxMqttTopicLengthExceededException,
        );
      });
    });
  });
  describe('handleMessage', () => {
    let getPublisherSpy: sinon.SinonSpy;

    const channel = 'test';
    const data = 'test';
    const id = '3';

    beforeEach(() => {
      getPublisherSpy = sinon.spy();
      sinon.stub(server, 'getPublisher').callsFake(() => getPublisherSpy);
    });
    it('should call "handleEvent" if identifier is not present', async () => {
      const handleEventSpy = sinon.spy(server, 'handleEvent');
      await server.handleMessage(
        channel,
        Buffer.from(JSON.stringify({ pattern: '', data })),
        null,
      );
      expect(handleEventSpy.called).to.be.true;
    });
    it(`should publish NO_MESSAGE_HANDLER if pattern not exists in messageHandlers object`, async () => {
      await server.handleMessage(
        channel,
        Buffer.from(JSON.stringify({ id, pattern: '', data })),
        null,
      );
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

      await server.handleMessage(
        channel,
        Buffer.from(JSON.stringify({ pattern: '', data, id: '2' })),
        null,
      );
      expect(handler.calledWith(data)).to.be.true;
    });
    it('should drop a request whose id is neither a number nor a short string', async () => {
      // Every reply carries the id, so it would be serialized for each of them
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [channel]: handler,
      });

      const error = await server
        .handleMessage(
          channel,
          Buffer.from(JSON.stringify({ pattern: '', data, id: [[['a']]] })),
          null,
        )
        .catch(err => err);

      expect(handler.called).to.be.false;
      expect(getPublisherSpy.called).to.be.false;
      expect(error).to.be.instanceOf(InvalidPacketIdException);
    });
  });
  describe('getPublisher', () => {
    let publisherSpy: sinon.SinonSpy;
    let pub, publisher;

    const id = '1';
    const pattern = 'test';
    const context = new MqttContext([pattern, {}]);

    beforeEach(() => {
      publisherSpy = sinon.spy();
      pub = {
        publish: publisherSpy,
      };
      publisher = server.getPublisher(pub, context, id);
    });
    it(`should return function`, () => {
      expect(typeof server.getPublisher(null, context, id)).to.be.eql(
        'function',
      );
    });
    it(`should throw if the reply topic would exceed the maximum topic length`, () => {
      const longestTopic = 'a'.repeat(MQTT_MAX_TOPIC_LENGTH - '/reply'.length);

      expect(() =>
        server.getPublisher(pub, new MqttContext([`${longestTopic}a`, {}]), id),
      ).to.throw(MaxMqttTopicLengthExceededException);
      expect(() =>
        server.getPublisher(pub, new MqttContext([longestTopic, {}]), id),
      ).to.not.throw();
    });
    it(`should call "publish" with expected arguments`, () => {
      const respond = 'test';
      publisher({ respond, id });
      expect(
        publisherSpy.calledWith(
          `${pattern}/reply`,
          JSON.stringify({ respond, id }),
        ),
      ).to.be.true;
    });
  });
  describe('getRequestPattern', () => {
    const test = 'test';
    it(`should leave pattern as it is`, () => {
      expect(server.getRequestPattern(test)).to.equal(test);
    });
  });
  describe('getReplyPattern', () => {
    const test = 'test';
    it(`should append "/reply" to string`, () => {
      const expectedResult = test + '/reply';
      expect(server.getReplyPattern(test)).to.equal(expectedResult);
    });
  });
  describe('parseMessage', () => {
    it(`should return parsed json`, () => {
      const obj = { test: 'test' };
      expect(server.parseMessage(obj)).to.deep.equal(
        JSON.parse(JSON.stringify(obj)),
      );
    });
    it(`should not parse argument if it is not an object`, () => {
      const content = 'test';
      expect(server.parseMessage(content)).to.equal(content);
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
  describe('matchMqttPattern', () => {
    [
      ['#', '$SYS'],
      ['#', '$SYS/broker/uptime'],
      ['+', '$SYS'],
      ['+/broker/uptime', '$SYS/broker/uptime'],
      ['#', '$custom'],
      ['+/#', '$custom/events'],
    ].forEach(([pattern, topic]) => {
      it(`should not match a leading wildcard in ${pattern} against the system topic ${topic}`, () => {
        expect(server.matchMqttPattern(pattern, topic)).to.be.false;
      });
    });

    [
      ['$SYS/#', '$SYS'],
      ['$SYS/#', '$SYS/broker/uptime'],
      ['$SYS/+/uptime', '$SYS/broker/uptime'],
      ['$custom/#', '$custom/events'],
      ['devices/+/status', 'devices/$sensor/status'],
    ].forEach(([pattern, topic]) => {
      it(`should preserve explicit dollar-prefixed filters and later dollar signs in ${pattern} against ${topic}`, () => {
        expect(server.matchMqttPattern(pattern, topic)).to.be.true;
      });
    });

    it('should return true when topic matches with provided pattern', () => {
      expect(server.matchMqttPattern('root/valid/+', 'root/valid/child')).to.be
        .true;
      expect(server.matchMqttPattern('root/valid/#', 'root/valid/child')).to.be
        .true;
      expect(
        server.matchMqttPattern('root/valid/#', 'root/valid/child/grandchild'),
      ).to.be.true;
      expect(server.matchMqttPattern('root/+/child', 'root/valid/child')).to.be
        .true;
    });

    it('should return false when topic does not matches with provided pattern', () => {
      expect(server.matchMqttPattern('root/test/+', 'root/invalid/child')).to.be
        .false;
      expect(server.matchMqttPattern('root/test/#', 'root/invalid/child')).to.be
        .false;
      expect(
        server.matchMqttPattern(
          'root/#/grandchild',
          'root/invalid/child/grandchild',
        ),
      ).to.be.false;
      expect(
        server.matchMqttPattern(
          'root/+/grandchild',
          'root/invalid/child/grandchild',
        ),
      ).to.be.false;
    });
  });
  describe('getHandlerByPattern', () => {
    ['$SYS/#', '$share/workers/$SYS/#'].forEach(pattern => {
      it(`should select ${pattern} over an earlier catch-all filter for a system topic`, () => {
        const wildcardHandler = sinon.spy();
        const systemHandler = sinon.spy();
        server.addHandler('#', wildcardHandler, true);
        server.addHandler(pattern, systemHandler, true);

        expect(server.getHandlerByPattern('$SYS/broker/uptime')).to.equal(
          systemHandler,
        );
      });
    });

    ['$shared/devices/#', '$shareware/devices/#'].forEach(pattern => {
      it(`should treat ${pattern} as a literal filter rather than a shared subscription`, () => {
        const literalHandler = sinon.spy();
        const telemetryHandler = sinon.spy();
        server.addHandler(pattern, literalHandler, true);
        server.addHandler('telemetry/#', telemetryHandler, true);

        expect(
          server.getHandlerByPattern(pattern.replace('#', 'status')),
        ).to.equal(literalHandler);
        expect(server.getHandlerByPattern('telemetry/temperature')).to.equal(
          telemetryHandler,
        );
      });
    });

    [
      ['$share/workers/devices/status', 'devices/status'],
      ['$share/workers/devices/+', 'devices/status'],
    ].forEach(([pattern, topic]) => {
      it(`should continue matching the shared subscription ${pattern} against ${topic}`, () => {
        const handler = sinon.spy();
        server.addHandler(pattern, handler, true);

        expect(server.getHandlerByPattern(topic)).to.equal(handler);
      });
    });

    // A broker takes '"admin/reset"' for a topic of its own, which an ACL
    // that denies "admin/#" lets through
    it('should not route a quoted topic to the handler of the unquoted one', () => {
      server.addHandler('admin/reset', sinon.spy());

      expect(server.getHandlerByPattern('"admin/reset"')).to.be.null;
    });
    it('should not match a quoted topic against wildcard patterns as unquoted', () => {
      server.addHandler('admin/+', sinon.spy());

      expect(server.getHandlerByPattern('"admin/reset"')).to.be.null;
    });
    it('should not route a number written differently to its handler', () => {
      server.addHandler(1000, sinon.spy());

      expect(server.getHandlerByPattern('1e3')).to.be.null;
    });
    it('should route the topic of an object pattern to its handler', () => {
      const handler = sinon.spy();
      server.addHandler({ cmd: 'sum', role: 'math' }, handler);

      expect(
        server.getHandlerByPattern('{"cmd":"sum","role":"math"}'),
      ).to.equal(handler);
      expect(
        server.getHandlerByPattern('{ "role": "math", "cmd": "sum" }'),
      ).to.equal(handler);
    });
  });
});
