import * as sinon from 'sinon';
import { expect } from 'chai';
import { ClientNats } from '../../client/client-nats';
import { ERROR_EVENT, CONNECT_EVENT, MESSAGE_EVENT } from '../../constants';

describe('ClientNats', () => {
  const test = 'test';
  const client = new ClientNats({});

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
  describe('publish', () => {
    const pattern = 'test';
    const msg = { pattern, data: 'data' };
    const id = 3;
    const subscriptionId = 10;

    let subscribeSpy: sinon.SinonSpy,
      publishSpy: sinon.SinonSpy,
      onSpy: sinon.SinonSpy,
      removeListenerSpy: sinon.SinonSpy,
      unsubscribeSpy: sinon.SinonSpy,
      initSpy: sinon.SinonSpy,
      natsClient,
      createClient: sinon.SinonStub;

    beforeEach(() => {
      subscribeSpy = sinon.spy(() => subscriptionId);
      publishSpy = sinon.spy();
      onSpy = sinon.spy();
      removeListenerSpy = sinon.spy();
      unsubscribeSpy = sinon.spy();

      natsClient = {
        subscribe: subscribeSpy,
        on: (type, handler) => (type === 'subscribe' ? handler() : onSpy()),
        removeListener: removeListenerSpy,
        unsubscribe: unsubscribeSpy,
        addListener: () => ({}),
        publish: publishSpy,
      };
      (client as any).natsClient = natsClient;

      initSpy = sinon.stub(client, 'init').callsFake(() => {
        (client as any).natsClient = natsClient;
      });
      createClient = sinon.stub(client, 'createClient').callsFake(() => client);
    });
    afterEach(() => {
      initSpy.restore();
      createClient.restore();
    });
    it('should not call "init()" when natsClient is not null', async () => {
      await client['publish'](msg, () => {});
      expect(initSpy.called).to.be.false;
    });
    it('should call "init()" when natsClient is null', async () => {
      (client as any).natsClient = null;
      await client['publish'](msg, () => {});
      expect(initSpy.called).to.be.true;
    });
    it('should subscribe to response pattern name', async () => {
      await client['publish'](msg, () => {});
      expect(subscribeSpy.calledWith(`"${pattern}"_res`)).to.be.true;
    });
    it('should publish stringified message to acknowledge pattern name', async () => {
      await client['publish'](msg, () => {});
      // expect(publishSpy.getCall(0).args).to.be.true;
      expect(publishSpy.getCall(0).args[0]).to.be.eql(`"${pattern}"_ack`);
    });
    describe('responseCallback', () => {
      let callback: sinon.SinonSpy, subscription, assignStub: sinon.SinonStub;
      const responseMessage = {
        err: null,
        response: 'test',
        id: '1',
      };

      describe('not disposed', () => {
        beforeEach(async () => {
          callback = sinon.spy();
          assignStub = sinon
            .stub(client, 'assignPacketId')
            .callsFake(packet =>
              Object.assign(packet, { id: responseMessage.id }),
            );
          subscription = await client['publish'](msg, callback);
          subscription(responseMessage);
        });
        afterEach(() => {
          assignStub.restore();
        });
        it('should call callback with expected arguments', () => {
          expect(
            callback.calledWith({
              err: null,
              response: responseMessage.response,
            }),
          ).to.be.true;
        });
        it('should not unsubscribe to response pattern name', () => {
          expect(unsubscribeSpy.calledWith(`"${pattern}"_res`)).to.be.false;
        });
      });
      describe('disposed and "id" is correct', () => {
        let assignStub: sinon.SinonStub;

        const channel = 'channel';
        const id = '1';

        beforeEach(async () => {
          callback = sinon.spy();
          assignStub = sinon
            .stub(client, 'assignPacketId')
            .callsFake(packet => Object.assign(packet, { id }));
          subscription = await client['publish'](msg, callback);
          subscription({ isDisposed: true, id });
        });

        afterEach(() => assignStub.restore());

        it('should call callback with dispose param', () => {
          expect(callback.called).to.be.true;
          expect(
            callback.calledWith({
              isDisposed: true,
              response: null,
              err: undefined,
            }),
          ).to.be.true;
        });
        it('should unsubscribe to response pattern name', () => {
          expect(unsubscribeSpy.calledWith(subscriptionId)).to.be.true;
        });
      });
      describe('disposed and "id" is incorrect', () => {
        let assignStub: sinon.SinonStub;

        const channel = 'channel';
        const id = '1';

        beforeEach(async () => {
          callback = sinon.spy();
          assignStub = sinon
            .stub(client, 'assignPacketId')
            .callsFake(packet => Object.assign(packet, { id }));
          subscription = await client['publish'](msg, callback);
          subscription({ isDisposed: true });
        });

        afterEach(() => assignStub.restore());

        it('should not call callback', () => {
          expect(callback.called).to.be.false;
        });
        it('should not unsubscribe to response pattern name', () => {
          expect(unsubscribeSpy.called).to.be.false;
        });
      });
    });
  });
  describe('close', () => {
    let natsClose: sinon.SinonSpy;
    let natsClient;
    beforeEach(() => {
      natsClose = sinon.spy();
      natsClient = { close: natsClose };
      (client as any).natsClient = natsClient;
    });
    it('should close "natsClient" when it is not null', () => {
      client.close();
      expect(natsClose.called).to.be.true;
    });
  });
  describe('init', () => {
    let createClientSpy: sinon.SinonSpy;
    let handleErrorsSpy: sinon.SinonSpy;

    beforeEach(async () => {
      createClientSpy = sinon.spy(client, 'createClient');
      handleErrorsSpy = sinon.spy(client, 'handleError');
      await client.init(sinon.spy());
    });
    afterEach(() => {
      createClientSpy.restore();
      handleErrorsSpy.restore();
    });
    it('should call "createClient"', () => {
      expect(createClientSpy.called).to.be.true;
    });
    it('should call "handleError"', () => {
      expect(handleErrorsSpy.called).to.be.true;
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
});
