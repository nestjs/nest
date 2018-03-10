import * as sinon from 'sinon';
import { expect } from 'chai';
import { ClientRedis } from '../../client/client-redis';

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
  describe('sendSingleMessage', () => {
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
      };
      pub = { publish: publishSpy };
      (client as any).sub = sub;
      (client as any).pub = pub;
      initSpy = sinon.spy(client, 'init');
    });
    afterEach(() => {
      initSpy.restore();
    });
    it('should not call "init()" when pub and sub are null', () => {
      client['sendSingleMessage'](msg, () => {});
      expect(initSpy.called).to.be.false;
    });
    it('should call "init()" when pub and sub are null', () => {
      (client as any).sub = null;
      (client as any).pub = null;
      client['sendSingleMessage'](msg, () => {});
      expect(initSpy.called).to.be.true;
    });
    it('should subscribe to response pattern name', () => {
      client['sendSingleMessage'](msg, () => {});
      expect(subscribeSpy.calledWith(`"${pattern}"_res`)).to.be.true;
    });
    it('should publish stringified message to acknowledge pattern name', () => {
      client['sendSingleMessage'](msg, () => {});
      expect(publishSpy.calledWith(`"${pattern}"_ack`, JSON.stringify(msg))).to
        .be.true;
    });
    it('should listen on messages', () => {
      client['sendSingleMessage'](msg, () => {});
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
          subscription = client['sendSingleMessage'](msg, callback);
          subscription(null, JSON.stringify(responseMessage));
        });
        it('should call callback with expected arguments', () => {
          expect(callback.calledWith(null, responseMessage.response)).to.be.true;
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
          subscription = client['sendSingleMessage'](msg, callback);
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
      (client as any).pub = pub;
      (client as any).sub = sub;
    });
    it('should close "pub" when it is not null', () => {
      client.close();
      expect(pubClose.called).to.be.true;
    });
    it('should not close "pub" when it is null', () => {
      (client as any).pub = null;
      client.close();
      expect(pubClose.called).to.be.false;
    });
    it('should close "sub" when it is not null', () => {
      client.close();
      expect(subClose.called).to.be.true;
    });
    it('should not close "sub" when it is null', () => {
      (client as any).sub = null;
      client.close();
      expect(subClose.called).to.be.false;
    });
  });
  describe('init', () => {
    let createClientSpy: sinon.SinonSpy;
    let handleErrorsSpy: sinon.SinonSpy;

    beforeEach(() => {
      createClientSpy = sinon.spy(client, 'createClient');
      handleErrorsSpy = sinon.spy(client, 'handleErrors');
      client.init(sinon.spy());
    });
    afterEach(() => {
      createClientSpy.restore();
      handleErrorsSpy.restore();
    });
    it('should call "createClient" twice', () => {
      expect(createClientSpy.calledTwice).to.be.true;
    });
    it('should call "handleErrors" twice', () => {
      expect(handleErrorsSpy.calledTwice).to.be.true;
    });
  });
});
