import { expect } from 'chai';
import { Subject } from 'rxjs';
import * as sinon from 'sinon';
import { ClientKafka } from '../../client/client-kafka';
import { ConsumerEvents, ConsumerGroupJoinEvent } from '../../external/kafka.interface';
import { ERROR_EVENT } from '../../constants';
// tslint:disable:no-string-literal

describe('ClientKafka', () => {
  // helpers
  const objectToMap = obj =>
    new Map(Object.keys(obj).map(key => [key, obj[key]]) as any);

  // spys
  let client: ClientKafka;
  let callback: sinon.SinonSpy;
  let connect: sinon.SinonSpy;
  let subscribe: sinon.SinonSpy;
  let run: sinon.SinonSpy;
  let send: sinon.SinonSpy;
  let on: sinon.SinonSpy;

  // stubs
  let consumerStub: sinon.SinonStub;
  let producerStub: sinon.SinonStub;
  let createClientStub: sinon.SinonStub;

  // other
  let kafkaClient;

  beforeEach(() => {
    client = new ClientKafka({});
    callback = sinon.spy();
    connect = sinon.spy();
    subscribe = sinon.spy();
    run = sinon.spy();
    send = sinon.spy();
    on = sinon.spy();

    consumerStub = sinon.stub(client, 'consumer')
      .callsFake(() => {
        return {
          connect,
          subscribe,
          run,
          events: {
            GROUP_JOIN: 'consumer.group_join'
          },
          on
        };
      });
    producerStub = sinon.stub(client, 'producer')
      .callsFake(() => {
        return {
          connect,
          send
        };
      });
    kafkaClient = {
      consumer: consumerStub,
      producer: producerStub,
    };

    createClientStub = sinon.stub(client, 'createClient').callsFake(() => kafkaClient);
  });

  describe('close', () => {
    const consumer = {disconnect: sinon.spy()};
    const producer = {disconnect: sinon.spy()};
    beforeEach(() => {
      (client as any).consumer = consumer;
      (client as any).producer = producer;
    });
    it('should close server', () => {
      client.close();

      expect(consumer.disconnect.calledOnce).to.be.true;
      expect(producer.disconnect.calledOnce).to.be.true;
      expect(client.consumer).to.be.null;
      expect(client.producer).to.be.null;
      expect(client.client).to.be.null;
    });
  });

  describe('connect', () => {
    let consumerAssignmentsStub: sinon.SinonStub;
    let bindTopicsStub: sinon.SinonStub;
    // let handleErrorsSpy: sinon.SinonSpy;

    beforeEach(() => {
      consumerAssignmentsStub = sinon.stub(client as any, 'consumerAssignments');
      bindTopicsStub = sinon.stub(client, 'bindTopics').callsFake(async () => {});
    });

    it('should expect the connection to be created', async () => {
      const connection = await client.connect();

      expect(createClientStub.calledOnce).to.be.true;
      expect(producerStub.calledOnce).to.be.true;
      expect(consumerStub.calledOnce).to.be.true;

      expect(on.calledOnce).to.be.true;
      expect((client as any).consumerAssignments).to.be.empty;

      expect(connect.calledTwice).to.be.true;

      expect(bindTopicsStub.calledOnce).to.be.true;
      expect(connection).to.deep.equal(producerStub());
    });

    it('should expect the connection to be reused', async () => {
      client.client = kafkaClient;
      await client.connect();

      expect(createClientStub.calledOnce).to.be.false;
      expect(producerStub.calledOnce).to.be.false;
      expect(consumerStub.calledOnce).to.be.false;

      expect(on.calledOnce).to.be.false;
      expect((client as any).consumerAssignments).to.be.empty;

      expect(connect.calledTwice).to.be.false;

      expect(bindTopicsStub.calledOnce).to.be.false;
    });

    // beforeEach(() => {
    //   createClientSpy = sinon.stub(client, 'createClient').callsFake(
    //     () =>
    //       ({
    //         addListener: () => null,
    //         removeListener: () => null,
    //       } as any),
    //   );
    //   handleErrorsSpy = sinon.spy(client, 'handleError');

    //   client.connect();
    //   client['pubClient'] = null;
    // });
    // afterEach(() => {
    //   createClientSpy.restore();
    //   handleErrorsSpy.restore();
    // });
    // it('should call "createClient" twice', () => {
    //   expect(createClientSpy.calledTwice).to.be.true;
    // });
    // it('should call "handleError" twice', () => {
    //   expect(handleErrorsSpy.calledTwice).to.be.true;
    // });
  });

  describe('setConsumerAssignments', () => {
    it('should update consumer assignments', async () => {
      await client.connect();

      const consumerAssignments: ConsumerGroupJoinEvent = {
        id: 'id',
        type: 'type',
        timestamp: 1234567890,
        payload: {
          duration: 20,
          groupId: 'group-id',
          isLeader: true,
          leaderId: 'member-1',
          groupProtocol: 'RoundRobin',
          memberId: 'member-1',
          memberAssignment: {
            'topic-a': [0, 1, 2]
          }
        }
      };

      (client as any).setConsumerAssignments(consumerAssignments);
      expect((client as any).consumerAssignments).to.deep.eq(consumerAssignments.payload.memberAssignment);
    });
  });

  describe('bindTopics', () => {
    it('should bind explicit topics', async () => {
      const getReplyPatternSpy = sinon.spy(client as any, 'getReplyPattern');

      (client as any).requestMap = objectToMap({
        'topic.request': 'topic.request.reply'
      });

      client.consumer = kafkaClient.consumer();

      // await client.connect();
      await client.bindTopics();

      expect(getReplyPatternSpy.calledOnce).to.be.true;
      expect(subscribe.calledOnce).to.be.true;
      expect((client as any).getReplyPattern('topic.request', (ClientKafka as any).REPLY_PATTERN_AFFIX)).to.eq('topic.request.reply');
    });

    it('should bind implicit topics', async () => {
      const getReplyPatternSpy = sinon.spy(client as any, 'getReplyPattern');

      (client as any).requestMap = objectToMap({
        'topic.request.implicit': null
      });

      client.consumer = kafkaClient.consumer();

      // await client.connect();
      await client.bindTopics();

      expect(getReplyPatternSpy.calledOnce).to.be.true;
      expect(subscribe.calledOnce).to.be.true;
      expect((client as any).getReplyPattern('topic.request.implicit', (ClientKafka as any).REPLY_PATTERN_AFFIX)).to.eq('topic.request.implicit.reply');
    });
  });
});
