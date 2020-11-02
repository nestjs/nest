import { expect } from 'chai';
import * as Kafka from 'kafkajs';
import { KafkaRoundRobinPartitionAssigner } from '../../helpers/kafka-round-robin-partition-assigner';

describe('kafka round robin by time', () => {
  let cluster, topics, metadata, assigner;

  beforeEach(() => {
    metadata = {};
    cluster = { findTopicPartitionMetadata: topic => metadata[topic] };
    assigner = new KafkaRoundRobinPartitionAssigner({ cluster });
    topics = ['topic-A', 'topic-B'];
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
                time: [0, 0], // process.hrtime()
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
                time: [0, 1], // process.hrtime()
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
                time: [1, 1], // process.hrtime()
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
                time: [2, 0], // process.hrtime()
              }),
            ),
          }),
        },
      ];

      const assignment = await assigner.assign({ members, topics });

      expect(assignment).to.deep.equal([
        {
          memberId: 'member-3',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [0, 4, 8, 12],
              'topic-B': [0, 4],
            },
            userData: Buffer.alloc(0),
          }),
        },
        {
          memberId: 'member-1',
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
          memberId: 'member-4',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [2, 6, 10],
              'topic-B': [2],
            },
            userData: Buffer.alloc(0),
          }),
        },
        {
          memberId: 'member-2',
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
      metadata['topic-A'] = Array(4)
        .fill(1)
        .map((_, i) => ({ partitionId: i }));

      metadata['topic-B'] = Array(4)
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
                time: [0, 0], // process.hrtime()
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
                time: [0, 1], // process.hrtime()
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
                time: [1, 1], // process.hrtime()
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
                time: [2, 0], // process.hrtime()
              }),
            ),
          }),
        },
      ];

      const assignment = await assigner.assign({ members, topics });

      const simpleAssignment = Buffer.from(
        JSON.stringify({
          assignment: {
            'member-3': {
              'topic-A': [0],
              'topic-B': [0],
            },
            'member-1': {
              'topic-A': [1],
              'topic-B': [1],
            },
            'member-4': {
              'topic-A': [2],
              'topic-B': [2],
            },
            'member-2': {
              'topic-A': [3],
              'topic-B': [3],
            },
          },
        }),
      );

      console.log(assignment);

      expect(assignment).to.deep.equal([
        {
          memberId: 'member-3',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [0],
              'topic-B': [0],
            },
            userData: simpleAssignment,
          }),
        },
        {
          memberId: 'member-1',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [1],
              'topic-B': [1],
            },
            userData: simpleAssignment,
          }),
        },
        {
          memberId: 'member-4',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [2],
              'topic-B': [2],
            },
            userData: simpleAssignment,
          }),
        },
        {
          memberId: 'member-2',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: {
              'topic-A': [3],
              'topic-B': [3],
            },
            userData: simpleAssignment,
          }),
        },
      ]);
    });
  });

  describe('protocol', () => {
    it('returns the assigner name and metadata', () => {
      expect(assigner.protocol({ topics })).to.deep.equal({
        name: assigner.name,
        metadata: Kafka.AssignerProtocol.MemberMetadata.encode({
          version: assigner.version,
          topics,
          userData: Buffer.from(
            JSON.stringify({
              time: assigner.getTime(),
            }),
          ),
        }),
      });
    });
  });
});
