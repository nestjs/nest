import { expect } from 'chai';
import * as sinon from 'sinon';
import { ServerKafka } from '../../server';
import { Logger } from '@nestjs/common';

class NoopLogger extends Logger {
  log(message: any, context?: string): void {}
  error(message: any, trace?: string, context?: string): void {}
  warn(message: any, context?: string): void {}
}

describe('ServerKafka', () => {
  let server: ServerKafka;

  beforeEach(() => {
    server = new ServerKafka({});
  });

  describe('close', () => {
    it('should close server', () => {
      server.close();
      expect(server.consumer).to.be.null;
      expect(server.producer).to.be.null;
      expect(server.client).to.be.null;
    });
  });

  let callback: sinon.SinonSpy;
  let bindEventsStub: sinon.SinonStub;
  let connect: sinon.SinonSpy;
  let subscribe: sinon.SinonSpy;
  let run: sinon.SinonSpy;
  let consumerStub: sinon.SinonStub;
  let producerStub: sinon.SinonStub;
  let client;
  beforeEach(() => {
    callback = sinon.spy();
    connect = sinon.spy();
    subscribe = sinon.spy();
    run = sinon.spy();
    bindEventsStub = sinon
      .stub(server, 'bindEvents')
      .callsFake(() => ({} as any));
    consumerStub = sinon.stub(server, 'consumer')
      .callsFake( () => {
        return {
          connect,
          subscribe,
          run,
        };
      });
    producerStub = sinon.stub(server, 'producer')
      .callsFake( () => {
        return {
          connect,
        };
      });
    client = {
      consumer: consumerStub,
      producer: producerStub,
    };
    sinon.stub(server, 'createClient').callsFake(() => client);
  });

  describe('listen', () => {
    it('should call "bindEvents"', async () => {
      await server.listen(callback);
      expect(bindEventsStub.called).to.be.true;
    });
    it('should call "client.start"', async () => {

      await server.listen(callback);
      expect(client.producer.called).to.be.true;
    });
    it('should call callback', async () => {
      await server.listen(callback);
      expect(callback.called).to.be.true;
    });
  });

  describe('bindEvents', () => {
    it('should not call subscribe nor run on consumer when there are no messageHandlers', async () => {
      (server as any).logger = new NoopLogger();
      await server.bindEvents(server.consumer);
      expect(subscribe.called).to.be.not.true;
      expect(run.called).to.be.not.true;
      expect(connect.called).to.be.not.true;
    });
  });
});
