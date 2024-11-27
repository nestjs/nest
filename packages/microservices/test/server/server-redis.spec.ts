import { expect } from 'chai';
import * as sinon from 'sinon';
import { NO_MESSAGE_HANDLER } from '../../constants';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context';
import { ServerRedis } from '../../server/server-redis';
import { objectToMap } from './utils/object-to-map';

describe('ServerRedis', () => {
  let server: ServerRedis;
  let untypedServer: any;

  beforeEach(() => {
    server = new ServerRedis({});
    untypedServer = server as any;
  });
  describe('listen', () => {
    let onSpy: sinon.SinonSpy;
    let connectSpy: sinon.SinonSpy;
    let client: any;
    let callbackSpy: sinon.SinonSpy;

    beforeEach(() => {
      onSpy = sinon.spy();
      connectSpy = sinon.spy();

      client = {
        on: onSpy,
        connect: connectSpy,
      };
      sinon.stub(server, 'createRedisClient').callsFake(() => client);

      callbackSpy = sinon.spy();
    });
    it('should bind "error" event to handler', () => {
      server.listen(callbackSpy);
      expect(onSpy.getCall(0).args[0]).to.be.equal('error');
    });
    it('should call "RedisClient#connect()"', () => {
      server.listen(callbackSpy);
      expect(connectSpy.called).to.be.true;
    });
    describe('when "start" throws an exception', () => {
      it('should call callback with a thrown error as an argument', () => {
        const error = new Error('random error');

        const callbackSpy = sinon.spy();
        sinon.stub(server, 'start').callsFake(() => {
          throw error;
        });
        server.listen(callbackSpy);
        expect(callbackSpy.calledWith(error)).to.be.true;
      });
    });
  });
  describe('close', () => {
    const pub = { quit: sinon.spy() };
    const sub = { quit: sinon.spy() };
    beforeEach(() => {
      untypedServer.pubClient = pub;
      untypedServer.subClient = sub;
    });
    it('should close pub & sub server', () => {
      server.close();

      expect(pub.quit.called).to.be.true;
      expect(sub.quit.called).to.be.true;
    });
  });
  describe('handleConnection', () => {
    let onSpy: sinon.SinonSpy, subscribeSpy: sinon.SinonSpy, sub, psub;

    beforeEach(() => {
      onSpy = sinon.spy();
      subscribeSpy = sinon.spy();
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
      expect(onSpy.getCall(0).args[0]).to.be.equal('message');
    });
    it('should bind "pmessage" event to handler if wildcards are enabled', () => {
      untypedServer.options = {};
      untypedServer.options.wildcards = true;

      server.bindEvents(psub, null);
      expect(onSpy.getCall(0).args[0]).to.be.equal('pmessage');
    });

    it('should "subscribe" to each pattern if wildcards are disabled', () => {
      const pattern = 'test';
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [pattern]: handler,
      });
      server.bindEvents(sub, null);
      expect(subscribeSpy.calledWith(pattern)).to.be.true;
    });

    it('should "psubscribe" to each pattern if wildcards are enabled', () => {
      untypedServer.options = {};
      untypedServer.options.wildcards = true;

      const pattern = 'test';
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [pattern]: handler,
      });
      server.bindEvents(psub, null);
      expect(subscribeSpy.calledWith(pattern)).to.be.true;
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
    });
    it('should call "handleEvent" if identifier is not present', async () => {
      const handleEventSpy = sinon.spy(server, 'handleEvent');
      sinon.stub(server, 'parseMessage').callsFake(() => ({ data }) as any);

      await server.handleMessage(channel, JSON.stringify({}), null, channel);
      expect(handleEventSpy.called).to.be.true;
    });
    it(`should publish NO_MESSAGE_HANDLER if pattern not exists in messageHandlers object`, async () => {
      sinon.stub(server, 'parseMessage').callsFake(() => ({ id, data }) as any);
      await server.handleMessage(
        channel,
        JSON.stringify({ id }),
        null,
        channel,
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
      sinon.stub(server, 'parseMessage').callsFake(() => ({ id, data }) as any);

      await server.handleMessage(channel, '', null, channel);
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
          `${pattern}.reply`,
          JSON.stringify({ respond, id }),
        ),
      ).to.be.true;
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
  describe('getRequestPattern', () => {
    const test = 'test';
    it(`should leave pattern as it is`, () => {
      const expectedResult = test;
      expect(server.getRequestPattern(test)).to.equal(expectedResult);
    });
  });
  describe('getReplyPattern', () => {
    const test = 'test';
    it(`should append ".reply" to string`, () => {
      const expectedResult = test + '.reply';
      expect(server.getReplyPattern(test)).to.equal(expectedResult);
    });
  });
  describe('getClientOptions', () => {
    it('should return options object with "retryStrategy" and call "createRetryStrategy"', () => {
      const createSpy = sinon.spy(server, 'createRetryStrategy');
      const { retryStrategy } = server.getClientOptions()!;
      try {
        retryStrategy!(0);
      } catch {
        // Ignore
      }
      expect(createSpy.called).to.be.true;
    });
  });
  describe('createRetryStrategy', () => {
    describe('when is terminated', () => {
      it('should return undefined', () => {
        untypedServer.isManuallyClosed = true;
        const result = server.createRetryStrategy(0);
        expect(result).to.be.undefined;
      });
    });
    describe('when "retryAttempts" does not exist', () => {
      it('should return undefined', () => {
        untypedServer.options.options = {};
        untypedServer.options.options.retryAttempts = undefined;

        expect(server.createRetryStrategy(4)).to.be.undefined;
      });
    });
    describe('when "attempts" count is max', () => {
      it('should return undefined', () => {
        untypedServer.options.options = {};
        untypedServer.options.options.retryAttempts = 3;

        expect(server.createRetryStrategy(4)).to.be.undefined;
      });
    });
    describe('otherwise', () => {
      it('should return delay (ms)', () => {
        untypedServer.options = {};
        untypedServer.isManuallyClosed = false;
        untypedServer.options.retryAttempts = 3;
        untypedServer.options.retryDelay = 3;
        const result = server.createRetryStrategy(2);
        expect(result).to.be.eql(untypedServer.options.retryDelay);
      });
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
});
