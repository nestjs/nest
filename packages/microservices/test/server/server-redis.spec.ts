import { expect } from 'chai';
import * as sinon from 'sinon';
import { NO_PATTERN_MESSAGE } from '../../constants';
import { ServerRedis } from '../../server/server-redis';

describe('ServerRedis', () => {
  let server: ServerRedis;
  beforeEach(() => {
    server = new ServerRedis({});
  });
  describe('listen', () => {
    let createRedisClient;
    let onSpy: sinon.SinonSpy;
    let client;

    beforeEach(() => {
      onSpy = sinon.spy();
      client = {
        on: onSpy,
      };
      createRedisClient = sinon
        .stub(server, 'createRedisClient')
        .callsFake(() => client);

      server.listen(null);
    });
    it('should bind "error" event to handler', () => {
      expect(onSpy.getCall(0).args[0]).to.be.equal('error');
    });
    it('should bind "connect" event to handler', () => {
      expect(onSpy.getCall(3).args[0]).to.be.equal('connect');
    });
    it('should bind "message" event to handler', () => {
      expect(onSpy.getCall(2).args[0]).to.be.equal('message');
    });
  });
  describe('close', () => {
    const pub = { quit: sinon.spy() };
    const sub = { quit: sinon.spy() };
    beforeEach(() => {
      (server as any).pubClient = pub;
      (server as any).subClient = sub;
    });
    it('should close pub & sub server', () => {
      server.close();

      expect(pub.quit.called).to.be.true;
      expect(sub.quit.called).to.be.true;
    });
  });
  describe('handleConnection', () => {
    let onSpy: sinon.SinonSpy, subscribeSpy: sinon.SinonSpy, sub;

    beforeEach(() => {
      onSpy = sinon.spy();
      subscribeSpy = sinon.spy();
      sub = {
        on: onSpy,
        subscribe: subscribeSpy,
      };
    });
    it('should bind "message" event to handler', () => {
      server.bindEvents(sub, null);
      expect(onSpy.getCall(0).args[0]).to.be.equal('message');
    });
    it('should subscribe each acknowledge patterns', () => {
      const pattern = 'test';
      const handler = sinon.spy();
      const objectToMap = obj =>
        new Map(Object.keys(obj).map(key => [key, obj[key]]) as any);

      (server as any).messageHandlers = objectToMap({
        [pattern]: handler,
      });
      server.bindEvents(sub, null);

      const expectedPattern = 'test_ack';
      expect(subscribeSpy.calledWith(expectedPattern)).to.be.true;
    });
  });
  describe('getMessageHandler', () => {
    it(`should return function`, () => {
      expect(typeof server.getMessageHandler(null)).to.be.eql('function');
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
      sinon.stub(server, 'deserialize').callsFake(() => ({ id, data }));
    });
    it(`should publish NO_PATTERN_MESSAGE if pattern not exists in messageHandlers object`, () => {
      server.handleMessage(channel, JSON.stringify({ id }), null);
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
      const objectToMap = obj =>
        new Map(Object.keys(obj).map(key => [key, obj[key]]) as any);

      (server as any).messageHandlers = objectToMap({
        [channel]: handler,
      });

      server.handleMessage(channel, {}, null);
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
  describe('getClientOptions', () => {
    it('should return options object with "retry_strategy" and call "createRetryStrategy"', () => {
      const createSpy = sinon.spy(server, 'createRetryStrategy');
      const { retry_strategy } = server.getClientOptions();
      retry_strategy({} as any);
      expect(createSpy.called).to.be.true;
    });
  });
  describe('createRetryStrategy', () => {
    describe('when is terminated', () => {
      it('should return undefined', () => {
        (server as any).isExplicitlyTerminated = true;
        const result = server.createRetryStrategy({} as any);
        expect(result).to.be.undefined;
      });
    });
    describe('when "retryAttempts" does not exist', () => {
      it('should return undefined', () => {
        (server as any).options.options = {};
        (server as any).options.options.retryAttempts = undefined;
        const result = server.createRetryStrategy({} as any);
        expect(result).to.be.undefined;
      });
    });
    describe('when "attempts" count is max', () => {
      it('should return undefined', () => {
        (server as any).options.options = {};
        (server as any).options.options.retryAttempts = 3;
        const result = server.createRetryStrategy({ attempt: 4 } as any);
        expect(result).to.be.undefined;
      });
    });
    describe('when ECONNREFUSED', () => {
      it('should call logger', () => {
        const loggerErrorSpy = sinon.spy((server as any).logger, 'error');
        const result = server.createRetryStrategy({
          error: { code: 'ECONNREFUSED' },
        } as any);
        expect(loggerErrorSpy.called).to.be.true;
      });
    });
    describe('otherwise', () => {
      it('should return delay (ms)', () => {
        (server as any).options = {};
        (server as any).isExplicitlyTerminated = false;
        (server as any).options.retryAttempts = 3;
        (server as any).options.retryDelay = 3;
        const result = server.createRetryStrategy({ attempt: 2 } as any);
        expect(result).to.be.eql((server as any).options.retryDelay);
      });
    });
  });
});
