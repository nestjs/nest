import { expect } from 'chai';
import * as sinon from 'sinon';
import { ServerKafka } from '../../server';
import { Logger } from '@nestjs/common';
import { MessageHandler } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { KafkaSerializer } from '../../helpers';
import { EachMessagePayload, KafkaMessage } from '@nestjs/microservices/external/kafka.interface';
import { KafkaHeaders } from '../../enums';

class NoopLogger extends Logger {
  log(message: any, context?: string): void {}
  error(message: any, trace?: string, context?: string): void {}
  warn(message: any, context?: string): void {}
}

describe('ServerKafka', () => {
  let server: ServerKafka;

  let callback: sinon.SinonSpy;
  let bindEventsStub: sinon.SinonStub;
  let connect: sinon.SinonSpy;
  let subscribe: sinon.SinonSpy;
  let run: sinon.SinonSpy;
  let consumerStub: sinon.SinonStub;
  let producerStub: sinon.SinonStub;
  let client;
  beforeEach(() => {
    server = new ServerKafka({});
    callback = sinon.spy();
    connect = sinon.spy();
    subscribe = sinon.spy();
    run = sinon.spy();

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

  const messageHandler: MessageHandler = (data): Promise<Observable<any>> => {
    Logger.log('something happened');
    const ob = new Observable();
    ob.subscribe(obResult => {
      Logger.log('something happened again');
    });
    return Promise.resolve(ob);
  };

  const messageValue = Buffer.from('test-message');
  const msg: KafkaMessage = {
    key: Buffer.from('test.key'),
    offset: '0',
    size: messageValue.length,
    value: messageValue,
    timestamp: Date.now().toString(),
    attributes: 1,
    headers: {
      [KafkaHeaders.CORRELATION_ID]: Buffer.from('test-id'),
      [KafkaHeaders.REPLY_TOPIC]: Buffer.from('test.key.reply'),
      [KafkaHeaders.REPLY_PARTITION]: Buffer.from('1'),
    }
  };

  describe('close', () => {
    it('should close server', () => {
      server.close();
      expect(server.consumer).to.be.null;
      expect(server.producer).to.be.null;
      expect(server.client).to.be.null;
    });
  });

  describe('listen', () => {

    it('should call "bindEvents"', async () => {
      bindEventsStub = sinon
        .stub(server, 'bindEvents')
        .callsFake(() => ({} as any));
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
      await server.listen(callback);
      await server.bindEvents(server.consumer);
      expect(subscribe.called).to.be.false;
      expect(run.called).to.be.true;
      expect(connect.called).to.be.true;
    });
    it('should call subscribe and run on consumer when there are messageHandlers', async () => {
      (server as any).logger = new NoopLogger();
      await server.listen(callback);
      await server.bindEvents(server.consumer);
      server.addHandler('example.pattern', messageHandler, false);
      await server.bindEvents(server.consumer);
      expect(subscribe.called).to.be.true;
      expect(run.called).to.be.true;
      expect(connect.called).to.be.true;
    });
  });

  describe('Serializer', () => {
    it('should serialize and deserialize the payload', async () => {
      const serializedMsg = KafkaSerializer.serialize<KafkaMessage>(msg);
      const unserializedMsg = KafkaSerializer.deserialize<KafkaMessage>(serializedMsg);
      expect(unserializedMsg).to.be.deep.eq(msg);
    });
  });

  describe('Messaging', () => {
    beforeEach(() => {
      sinon.stub(server, 'getHandlerByPattern')
        .callsFake(() => messageHandler);
    });
    it('should handleMessage correctly', async () => {
      await server.listen(callback);
      const payload: EachMessagePayload = {
        message: msg,
        partition: 1,
        topic: 'test-topic'
      };
      await server.handleMessage(payload);
    });
  });
});
