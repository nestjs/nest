import { expect } from 'chai';
import * as sinon from 'sinon';
import { NO_MESSAGE_HANDLER } from '../../constants';
import { NatsContext } from '../../ctx-host';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context';
import { ServerNats } from '../../server/server-nats';

describe('ServerNats', () => {
  let server: ServerNats;

  const objectToMap = obj =>
    new Map(Object.keys(obj).map(key => [key, obj[key]]) as any);

  beforeEach(() => {
    server = new ServerNats({});
  });
  describe('listen', () => {
    let createNatsClient;
    let onSpy: sinon.SinonSpy;
    let client;

    beforeEach(() => {
      onSpy = sinon.spy();
      client = {
        on: onSpy,
      };
      createNatsClient = sinon
        .stub(server, 'createNatsClient')
        .callsFake(() => client);

      server.listen(null);
    });
    it('should bind "error" event to handler', () => {
      expect(onSpy.getCall(0).args[0]).to.be.equal('error');
    });
    it('should bind "connect" event to handler', () => {
      expect(onSpy.getCall(1).args[0]).to.be.equal('connect');
    });
  });
  describe('close', () => {
    const natsClient = { close: sinon.spy() };
    beforeEach(() => {
      (server as any).natsClient = natsClient;
    });
    it('should close natsClient', () => {
      server.close();
      expect(natsClient.close.called).to.be.true;
    });
  });
  describe('bindEvents', () => {
    let onSpy: sinon.SinonSpy, subscribeSpy: sinon.SinonSpy, natsClient;

    beforeEach(() => {
      onSpy = sinon.spy();
      subscribeSpy = sinon.spy();
      natsClient = {
        on: onSpy,
        subscribe: subscribeSpy,
      };
    });
    it('should subscribe to each acknowledge patterns', () => {
      const pattern = 'test';
      const handler = sinon.spy();
      (server as any).messageHandlers = objectToMap({
        [pattern]: handler,
      });
      server.bindEvents(natsClient);
      expect(subscribeSpy.calledWith(pattern)).to.be.true;
    });
  });
  describe('getMessageHandler', () => {
    it(`should return function`, () => {
      expect(
        typeof server.getMessageHandler(null, (server as any).natsClient),
      ).to.be.eql('function');
    });
    describe('handler', () => {
      it('should call "handleMessage"', async () => {
        const handleMessageStub = sinon
          .stub(server, 'handleMessage')
          .callsFake(() => null);
        (await server.getMessageHandler('', (server as any).natsClient))(
          '' as any,
          '',
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
    it('should call "handleEvent" if identifier is not present', () => {
      const handleEventSpy = sinon.spy(server, 'handleEvent');
      server.handleMessage(channel, { pattern: '', data: '' }, null, '', '');
      expect(handleEventSpy.called).to.be.true;
    });
    it(`should publish NO_MESSAGE_HANDLER if pattern not exists in messageHandlers object`, () => {
      server.handleMessage(
        channel,
        { id, pattern: '', data: '' },
        null,
        '',
        '',
      );
      expect(
        getPublisherSpy.calledWith({
          id,
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        }),
      ).to.be.true;
    });
    it(`should call handler with expected arguments`, () => {
      const handler = sinon.spy();
      (server as any).messageHandlers = objectToMap({
        [channel]: handler,
      });

      const callerSubject = 'subject';
      const replyTo = 'message-id';
      const natsContext = new NatsContext([callerSubject, replyTo]);
      server.handleMessage(
        channel,
        { pattern: '', data, id: '2' },
        null,
        replyTo,
        callerSubject,
      );
      expect(handler.calledWith(data, natsContext)).to.be.true;
    });
  });
  describe('getPublisher', () => {
    let publisherSpy: sinon.SinonSpy;
    let pub, publisher;

    const id = '1';
    const replyTo = 'test';

    beforeEach(() => {
      publisherSpy = sinon.spy();
      pub = {
        publish: publisherSpy,
      };
      publisher = server.getPublisher(pub, replyTo, id);
    });
    it(`should return function`, () => {
      expect(typeof server.getPublisher(null, null, id)).to.be.eql('function');
    });
    it(`should call "publish" with expected arguments`, () => {
      const respond = 'test';
      publisher({ respond, id });
      expect(publisherSpy.calledWith(replyTo, { respond, id })).to.be.true;
    });
  });
  describe('handleEvent', () => {
    const channel = 'test';
    const data = 'test';

    it('should call handler with expected arguments', () => {
      const handler = sinon.spy();
      (server as any).messageHandlers = objectToMap({
        [channel]: handler,
      });

      server.handleEvent(
        channel,
        { pattern: '', data },
        new BaseRpcContext([]),
      );
      expect(handler.calledWith(data)).to.be.true;
    });
  });
});
