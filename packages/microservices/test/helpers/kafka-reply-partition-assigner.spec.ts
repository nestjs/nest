import { expect } from 'chai';
import * as sinon from 'sinon';
import * as Kafka from 'kafkajs';
import { KafkaReplyPartitionAssigner } from '../../helpers/kafka-reply-partition-assigner';
import { ClientKafka } from '../../client/client-kafka';

describe('kafka reply partition assigner', () => {
  let cluster, topics, metadata, assigner, client;

  let getConsumerAssignments: sinon.SinonSpy;
  let getPreviousAssignment: sinon.SinonSpy;

  beforeEach(() => {
    metadata = {};
    cluster = { findTopicPartitionMetadata: topic => metadata[topic] };
    client = new ClientKafka({});
    assigner = new KafkaReplyPartitionAssigner(client, { cluster });
    topics = ['topic-A', 'topic-B'];

    getConsumerAssignments = sinon.spy(client, 'getConsumerAssignments');
    getPreviousAssignment = sinon.spy(assigner, 'getPreviousAssignment');

    // reset previous assignments
    client.consumerAssignments = {};
  });

  describe('assign', () => {
    it('assign all partitions evenly', async () => {
      metadata['topic-A'] = Array(14)
        .fill(1)
        .map((_, i) => ({ partitionId: i }));

      metadata['topic-B'] = Array(5)
        .fill(1)
        .map((_, i) => ({ partitionId: i }));

      const members = [
        {
          memberId: 'member-3',
          memberMetadata: Kafka.AssignerProtocol.MemberMetadata.encode({
            version: assigner.version,
            topics: ['topic-A', 'topic-B'],
            userData: Buffer.from(
              JSON.stringify({
                previousAssignment: {},
              }),
            ),
          }),
        },
        {
          memberId: 'member-1',
          memberMetadata: Kafka.AssignerProtocol.MemberMetadata.encode({
            version: assigner.version,
            topics: ['topic-A', 'topic-B'],
            userData: Buffer.from(
              JSON.stringify({
                previousAssignment: {},
              }),
            ),
          }),
        },
        {
          memberId: 'member-4',
          memberMetadata: Kafka.AssignerProtocol.MemberMetadata.encode({
            version: assigner.version,
            topics: ['topic-A', 'topic-B'],
            userData: Buffer.from(
              JSON.stringify({
                previousAssignment: {},
              }),
            ),
          }),
        },
        {
          memberId: 'member-2',
          memberMetadata: Kafka.AssignerProtocol.MemberMetadata.encode({
            version: assigner.version,
            topics: ['topic-A', 'topic-B'],
            userData: Buffer.from(
              JSON.stringify({
                previousAssignment: {},
              }),
            ),
          }),
        },
      ];

      const assignment = await assigner.assign({ members, topics });

      expect(assignment).to.deep.equal([
        {
          memberId: 'member-1',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [0, 4, 8, 12],
              'topic-B': [0],
            },
            userData: Buffer.alloc(0),
          }),
        },
        {
          memberId: 'member-2',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [1, 5, 9, 13],
              'topic-B': [1],
            },
            userData: Buffer.alloc(0),
          }),
        },
        {
          memberId: 'member-3',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [2, 6, 10],
              'topic-B': [2, 4],
            },
            userData: Buffer.alloc(0),
          }),
        },
        {
          memberId: 'member-4',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [3, 7, 11],
              'topic-B': [3],
            },
            userData: Buffer.alloc(0),
          }),
        },
      ]);
    });
  });

  describe('re-assign', () => {
    it('assign all partitions evenly', async () => {
      metadata['topic-A'] = Array(11)
        .fill(1)
        .map((_, i) => ({ partitionId: i }));

      metadata['topic-B'] = Array(7)
        .fill(1)
        .map((_, i) => ({ partitionId: i }));

      const members = [
        {
          memberId: 'member-3',
          memberMetadata: Kafka.AssignerProtocol.MemberMetadata.encode({
            version: assigner.version,
            topics: ['topic-A', 'topic-B'],
            userData: Buffer.from(
              JSON.stringify({
                previousAssignment: {
                  'topic-A': 0,
                  'topic-B': 0,
                },
              }),
            ),
          }),
        },
        {
          memberId: 'member-1',
          memberMetadata: Kafka.AssignerProtocol.MemberMetadata.encode({
            version: assigner.version,
            topics: ['topic-A', 'topic-B'],
            userData: Buffer.from(
              JSON.stringify({
                previousAssignment: {
                  'topic-A': 1,
                  'topic-B': 1,
                },
              }),
            ),
          }),
        },
        {
          memberId: 'member-4',
          memberMetadata: Kafka.AssignerProtocol.MemberMetadata.encode({
            version: assigner.version,
            topics: ['topic-A', 'topic-B'],
            userData: Buffer.from(
              JSON.stringify({
                previousAssignment: {
                  'topic-A': 2,
                },
              }),
            ),
          }),
        },
        {
          memberId: 'member-2',
          memberMetadata: Kafka.AssignerProtocol.MemberMetadata.encode({
            version: assigner.version,
            topics: ['topic-A', 'topic-B'],
            userData: Buffer.from(
              JSON.stringify({
                previousAssignment: {},
              }),
            ),
          }),
        },
      ];

      const assignment = await assigner.assign({ members, topics });

      expect(assignment).to.deep.equal([
        {
          memberId: 'member-1',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [1, 4, 8],
              'topic-B': [1, 5],
            },
            userData: Buffer.alloc(0),
          }),
        },
        {
          memberId: 'member-2',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [3, 5, 9],
              'topic-B': [2, 6],
            },
            userData: Buffer.alloc(0),
          }),
        },
        {
          memberId: 'member-3',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [0, 6, 10],
              'topic-B': [0],
            },
            userData: Buffer.alloc(0),
          }),
        },
        {
          memberId: 'member-4',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [2, 7],
              'topic-B': [3, 4],
            },
            userData: Buffer.alloc(0),
          }),
        },
      ]);
    });
  });

  describe('protocol', () => {
    it('returns the assigner name and metadata', () => {
      // set previous assignments
      client.consumerAssignments = {
        'topic-A': 0,
        'topic-B': 1,
      };

      const protocol = assigner.protocol({ topics });

      expect(getPreviousAssignment.calledOnce).to.be.true;
      expect(getConsumerAssignments.calledOnce).to.be.true;

      expect(protocol).to.deep.equal({
        name: assigner.name,
        metadata: Kafka.AssignerProtocol.MemberMetadata.encode({
          version: assigner.version,
          topics,
          userData: Buffer.from(
            JSON.stringify({
              previousAssignment: client.consumerAssignments,
            }),
          ),
        }),
      });
    });
  });
});
