import * as sinon from 'sinon';
import { expect } from 'chai';
import { NO_PATTERN_MESSAGE } from '../../constants';
import { ServerMqtt } from '../../server/server-mqtt';
import { Observable } from 'rxjs';

describe('ServerMqtt', () => {
  let server: ServerMqtt;
  beforeEach(() => {
    server = new ServerMqtt({});
  });
  describe('listen', () => {
    let createMqttClient;
    let onSpy: sinon.SinonSpy;
    let client;

    beforeEach(() => {
      onSpy = sinon.spy();
      client = {
        on: onSpy,
      };
      createMqttClient = sinon
        .stub(server, 'createMqttClient')
        .callsFake(() => client);

      server.listen(null);
    });
    it('should bind "error" event to handler', () => {
      expect(onSpy.getCall(0).args[0]).to.be.equal('error');
    });
    it('should bind "message" event to handler', () => {
      expect(onSpy.getCall(1).args[0]).to.be.equal('message');
    });
    it('should bind "connect" event to handler', () => {
      expect(onSpy.getCall(2).args[0]).to.be.equal('connect');
    });
  });
  describe('close', () => {
    const mqttClient = { end: sinon.spy() };
    beforeEach(() => {
      (server as any).mqttClient = mqttClient;
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
    it('should subscribe each acknowledge patterns', () => {
      const pattern = 'test';
      const handler = sinon.spy();
      (server as any).messageHandlers = {
        [pattern]: handler,
      };
      server.bindEvents(mqttClient);

      const expectedPattern = 'test_ack';
      expect(subscribeSpy.calledWith(expectedPattern)).to.be.true;
    });
  });
  describe('getMessageHandler', () => {
    it(`should return function`, () => {
      expect(
        typeof server.getMessageHandler((server as any).mqttClient),
      ).to.be.eql('function');
    });
    describe('handler', () => {
      it('should call "handleMessage"', async () => {
        const handleMessageStub = sinon
          .stub(server, 'handleMessage')
          .callsFake(() => null);
        (await server.getMessageHandler((server as any).mqttClient))(null);
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
    it(`should publish NO_PATTERN_MESSAGE if pattern not exists in messageHandlers object`, () => {
      server.handleMessage(
        channel,
        new Buffer(JSON.stringify({ id, pattern: '', data })),
        null,
      );
      expect(
        getPublisherSpy.calledWith({
          id,
          status: 'error',
          err: NO_PATTERN_MESSAGE,
        }),
      ).to.be.true;
    });
    it(`should call handler with expected arguments`, () => {
      const handler = sinon.spy();
      (server as any).messageHandlers = {
        [channel]: handler,
      };

      server.handleMessage(
        channel,
        new Buffer(JSON.stringify({ pattern: '', data, id: '2' })),
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
          `${pattern}_res`,
          JSON.stringify({ respond, id }),
        ),
      ).to.be.true;
    });
  });
  describe('getAckPatternName', () => {
    const test = 'test';
    it(`should append _ack to string`, () => {
      const expectedResult = test + '_ack';
      expect(server.getAckQueueName(test)).to.equal(expectedResult);
    });
  });
  describe('getResPatternName', () => {
    const test = 'test';
    it(`should append _res to string`, () => {
      const expectedResult = test + '_res';
      expect(server.getResQueueName(test)).to.equal(expectedResult);
    });
  });
  describe('deserialize', () => {
    it(`should return parsed json`, () => {
      const obj = { test: 'test' };
      expect(server.deserialize(obj)).to.deep.equal(
        JSON.parse(JSON.stringify(obj)),
      );
    });
    it(`should not parse argument if it is not an object`, () => {
      const content = 'test';
      expect(server.deserialize(content)).to.equal(content);
    });
  });
});
