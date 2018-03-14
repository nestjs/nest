import * as sinon from 'sinon';
import { expect } from 'chai';
import { ClientRedis } from '../../client/client-redis';
import { ERROR_EVENT, CONNECT_EVENT } from '../../constants';

describe('ClientRedis', () => {
  const test = 'test';
  const client = new ClientRedis({});

  describe('getAckPatternName', () => {
    it(`should append _ack to string`, () => {
      const expectedResult = test + '_ack';
      expect(client.getAckPatternName(test)).to.equal(expectedResult);
    });
  });
  describe('getResPatternName', () => {
    it(`should append _res to string`, () => {
      const expectedResult = test + '_res';
      expect(client.getResPatternName(test)).to.equal(expectedResult);
    });
  });
  describe('sendMessage', () => {
    const pattern = 'test';
    const msg = { pattern };
    let subscribeSpy: sinon.SinonSpy,
      publishSpy: sinon.SinonSpy,
      onSpy: sinon.SinonSpy,
      removeListenerSpy: sinon.SinonSpy,
      unsubscribeSpy: sinon.SinonSpy,
      initSpy: sinon.SinonSpy,
      sub,
      pub;

    beforeEach(() => {
      subscribeSpy = sinon.spy();
      publishSpy = sinon.spy();
      onSpy = sinon.spy();
      removeListenerSpy = sinon.spy();
      unsubscribeSpy = sinon.spy();

      sub = {
        subscribe: subscribeSpy,
        on: onSpy,
        removeListener: removeListenerSpy,
        unsubscribe: unsubscribeSpy,
        addListener: () => ({}),
      };
      pub = { publish: publishSpy };
      (client as any).subClient = sub;
      (client as any).pubClient = pub;
      initSpy = sinon.spy(client, 'init');
    });
    afterEach(() => {
      initSpy.restore();
    });
    it('should not call "init()" when pub and sub are null', () => {
      client['sendMessage'](msg, () => {});
      expect(initSpy.called).to.be.false;
    });
    it('should call "init()" when pub and sub are null', () => {
      (client as any).subClient = null;
      (client as any).pubClient = null;
      client['sendMessage'](msg, () => {});
      expect(initSpy.called).to.be.true;
    });
    it('should subscribe to response pattern name', () => {
      client['sendMessage'](msg, () => {});
      expect(subscribeSpy.calledWith(`"${pattern}"_res`)).to.be.true;
    });
    it('should publish stringified message to acknowledge pattern name', () => {
      client['sendMessage'](msg, () => {});
      expect(publishSpy.calledWith(`"${pattern}"_ack`, JSON.stringify(msg))).to
        .be.true;
    });
    it('should listen on messages', () => {
      client['sendMessage'](msg, () => {});
      expect(onSpy.called).to.be.true;
    });
    describe('responseCallback', () => {
      let callback, subscription;
      const responseMessage = {
        err: null,
        response: 'test',
      };

      describe('not disposed', () => {
        beforeEach(() => {
          callback = sinon.spy();
<<<<<<< HEAD
          subscription = client['sendMessage'](msg, callback);
          subscription(null, JSON.stringify(resMsg));
=======
          subscription = client['sendSingleMessage'](msg, callback);
          subscription(null, JSON.stringify(responseMessage));
>>>>>>> master
        });
        it('should call callback with expected arguments', () => {
          expect(callback.calledWith(null, responseMessage.response)).to.be
            .true;
        });
        it('should not unsubscribe to response pattern name', () => {
          expect(unsubscribeSpy.calledWith(`"${pattern}"_res`)).to.be.false;
        });
        it('should not remove listener', () => {
          expect(removeListenerSpy.called).to.be.false;
        });
      });
      describe('disposed', () => {
        beforeEach(() => {
          callback = sinon.spy();
          subscription = client['sendMessage'](msg, callback);
          subscription(null, JSON.stringify({ disposed: true }));
        });
        it('should call callback with dispose param', () => {
          expect(callback.called).to.be.true;
          expect(callback.calledWith(undefined, null, true)).to.be.true;
        });
        it('should unsubscribe to response pattern name', () => {
          expect(unsubscribeSpy.calledWith(`"${pattern}"_res`)).to.be.true;
        });
        it('should remove listener', () => {
          expect(removeListenerSpy.called).to.be.true;
        });
      });
    });
  });
  describe('close', () => {
    let pubClose: sinon.SinonSpy;
    let subClose: sinon.SinonSpy;
    let pub, sub;
    beforeEach(() => {
      pubClose = sinon.spy();
      subClose = sinon.spy();
      pub = { quit: pubClose };
      sub = { quit: subClose };
      (client as any).pubClient = pub;
      (client as any).subClient = sub;
    });
    it('should close "pub" when it is not null', () => {
      client.close();
      expect(pubClose.called).to.be.true;
    });
    it('should not close "pub" when it is null', () => {
      (client as any).pubClient = null;
      client.close();
      expect(pubClose.called).to.be.false;
    });
    it('should close "sub" when it is not null', () => {
      client.close();
      expect(subClose.called).to.be.true;
    });
    it('should not close "sub" when it is null', () => {
      (client as any).subClient = null;
      client.close();
      expect(subClose.called).to.be.false;
    });
  });
  describe('init', () => {
    let createClientSpy: sinon.SinonSpy;
    let handleErrorsSpy: sinon.SinonSpy;

    beforeEach(() => {
      createClientSpy = sinon.spy(client, 'createClient');
      handleErrorsSpy = sinon.spy(client, 'handleError');
      client.init(sinon.spy());
    });
    afterEach(() => {
      createClientSpy.restore();
      handleErrorsSpy.restore();
    });
    it('should call "createClient" twice', () => {
      expect(createClientSpy.calledTwice).to.be.true;
    });
    it('should call "handleError" twice', () => {
      expect(handleErrorsSpy.calledTwice).to.be.true;
    });
  });
  describe('handleError', () => {
    it('should bind error event handler and call callback with error', () => {
      const callback = sinon.spy();
      const removeListenerSpy = sinon.spy();

      const addListener = (name, fn) => {
        const err = { code: 'ECONNREFUSED' };
        fn(err);
      
        expect(name).to.be.eql(ERROR_EVENT);
        expect(callback.called).to.be.true;
        expect(callback.calledWith(err, null)).to.be.true;
      };
      const onCallback = (name, fn) => {
        fn();
        expect(name).to.be.eql(CONNECT_EVENT);
        expect(removeListenerSpy.called).to.be.true;
      };

      const stream = {
        addListener,
        on: onCallback,
        removeListener: removeListenerSpy,
      };
      client.handleError(stream as any, callback);
    });
  });
  describe('getClientOptions', () => {
    it('should return options object with "retry_strategy" and call "createRetryStrategy"', () => {
      const createSpy = sinon.spy(client, 'createRetryStrategy');
      const { retry_strategy } = client.getClientOptions();
      retry_strategy({} as any);
      expect(createSpy.called).to.be.true;
    });
  });
  describe('createRetryStrategy', () => {
    describe('when is terminated', () => {
      it('should return undefined', () => {
        (client as any).isExplicitlyTerminated = true;
        const result = client.createRetryStrategy({} as any);
        expect(result).to.be.undefined;
      });
    });
    describe('when "retryAttempts" does not exist', () => {
      it('should return undefined', () => {
        (client as any).metadata.retryAttempts = undefined;
        const result = client.createRetryStrategy({} as any);
        expect(result).to.be.undefined;
      });
    });
    describe('when "attempts" count is max', () => {
      it('should return undefined', () => {
        (client as any).metadata.retryAttempts = 3;
        const result = client.createRetryStrategy({ attempt: 4 } as any);
        expect(result).to.be.undefined;
      });
    });
    describe('otherwise', () => {
      it('should return delay (ms)', () => {
        (client as any).isExplicitlyTerminated = false;
        (client as any).metadata.retryAttempts = 3;
        (client as any).metadata.retryDelay = 3;
        const result = client.createRetryStrategy({ attempt: 2 } as any);
        expect(result).to.be.eql((client as any).metadata.retryDelay);
      });
    })
  });
});
