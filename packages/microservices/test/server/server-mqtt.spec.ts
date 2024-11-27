import { expect } from 'chai';
import * as sinon from 'sinon';
import { NO_MESSAGE_HANDLER } from '../../constants';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context';
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
          .callsFake(() => null!);
        await server.getMessageHandler(untypedServer.mqttClient)(
          null!,
          null!,
          null!,
        );
        expect(handleMessageStub.called).to.be.true;
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
  });
  describe('getPublisher', () => {
    let publisherSpy: sinon.SinonSpy;
    let pub, publisher;

    const id = '1';
    const pattern = 'test';

    beforeEach(() => {
      publisherSpy = sinon.spy();
      pub = {
        publish: publisherSpy,
      };
      publisher = server.getPublisher(pub, pattern, id);
    });
    it(`should return function`, () => {
      expect(typeof server.getPublisher(null, null, id)).to.be.eql('function');
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
});
