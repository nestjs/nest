import * as Kafka from 'kafkajs';
import { ClientKafka } from '../../client/client-kafka.js';
import { KafkaReplyPartitionAssigner } from '../../helpers/kafka-reply-partition-assigner.js';

describe('kafka reply partition assigner', () => {
  let cluster, topics, metadata, assigner, client;

  let getConsumerAssignments: ReturnType<typeof vi.fn>;
  let getPreviousAssignment: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    metadata = {};
    cluster = { findTopicPartitionMetadata: topic => metadata[topic] };
    client = new ClientKafka({});
    assigner = new KafkaReplyPartitionAssigner(client, { cluster });
    topics = ['topic-A', 'topic-B'];

    getConsumerAssignments = vi.spyOn(client, 'getConsumerAssignments');
    getPreviousAssignment = vi.spyOn(assigner, 'getPreviousAssignment');

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

      expect(assignment).toEqual([
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

      expect(assignment).toEqual([
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

  describe('decodeMember', () => {
    const encodeMember = (userData: Buffer) => ({
      memberId: 'member-1',
      memberMetadata: Kafka.AssignerProtocol.MemberMetadata.encode({
        version: assigner.version,
        topics: ['topic-A'],
        userData,
      }),
    });

    it('reads the previous assignment of a well-formed member', () => {
      const previousAssignment = { 'topic-A': 3 };
      const member = encodeMember(
        Buffer.from(JSON.stringify({ previousAssignment })),
      );

      expect(assigner.decodeMember(member)).toEqual({
        memberId: 'member-1',
        previousAssignment,
      });
    });

    it.each([
      ['empty', Buffer.alloc(0)],
      ['invalid json', Buffer.from('not-json')],
      ['null', Buffer.from('null')],
      ['missing property', Buffer.from('{}')],
      ['array', Buffer.from('{"previousAssignment":[1,2]}')],
      ['non-object', Buffer.from('{"previousAssignment":"topic-A"}')],
    ])(
      'degrades metadata that is %s to an empty assignment',
      (_label, userData) => {
        const member = encodeMember(userData);

        expect(assigner.decodeMember(member)).toEqual({
          memberId: 'member-1',
          previousAssignment: {},
        });
      },
    );

    it('degrades metadata that cannot be decoded to an empty assignment', () => {
      const member = { memberId: 'member-1', memberMetadata: Buffer.alloc(0) };

      expect(assigner.decodeMember(member)).toEqual({
        memberId: 'member-1',
        previousAssignment: {},
      });
    });
  });

  describe('assign with malformed member metadata', () => {
    beforeEach(() => {
      metadata['topic-A'] = Array(2)
        .fill(1)
        .map((_, i) => ({ partitionId: i }));
      topics = ['topic-A'];
    });

    it('does not throw and still assigns every partition', async () => {
      const members = [
        {
          memberId: 'member-1',
          memberMetadata: Kafka.AssignerProtocol.MemberMetadata.encode({
            version: assigner.version,
            topics: ['topic-A'],
            userData: Buffer.from('not-json'),
          }),
        },
        {
          memberId: 'member-2',
          memberMetadata: Kafka.AssignerProtocol.MemberMetadata.encode({
            version: assigner.version,
            topics: ['topic-A'],
            userData: Buffer.alloc(0),
          }),
        },
      ];

      const assignment = await assigner.assign({ members, topics });

      expect(assignment).toEqual([
        {
          memberId: 'member-1',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: { 'topic-A': [0] },
          }),
        },
        {
          memberId: 'member-2',
          memberAssignment: Kafka.AssignerProtocol.MemberAssignment.encode({
            version: assigner.version,
            assignment: { 'topic-A': [1] },
          }),
        },
      ]);
    });
  });

  describe('assign with conflicting previous assignments', () => {
    const encodeMember = (memberId: string, previousAssignment: object) => ({
      memberId,
      memberMetadata: Kafka.AssignerProtocol.MemberMetadata.encode({
        version: assigner.version,
        topics: ['topic-A'],
        userData: Buffer.from(JSON.stringify({ previousAssignment })),
      }),
    });
    const encodeAssignment = (partitions: number[]) =>
      Kafka.AssignerProtocol.MemberAssignment.encode({
        version: assigner.version,
        assignment: { 'topic-A': partitions },
      });

    beforeEach(() => {
      metadata['topic-A'] = Array(2)
        .fill(1)
        .map((_, i) => ({ partitionId: i }));
      topics = ['topic-A'];
    });

    it('assigns a partition claimed by two members only once', async () => {
      const assignment = await assigner.assign({
        members: [
          encodeMember('member-1', { 'topic-A': 0 }),
          encodeMember('member-2', { 'topic-A': 0 }),
        ],
        topics,
      });

      expect(assignment).toEqual([
        { memberId: 'member-1', memberAssignment: encodeAssignment([0]) },
        { memberId: 'member-2', memberAssignment: encodeAssignment([1]) },
      ]);
    });

    it.each([
      ['a partition that does not exist', 99],
      ['a value that is not a partition', 'x'],
      ['null', null],
    ])(
      'gives a free partition to a member that claims %s',
      async (_label, claimed) => {
        const assignment = await assigner.assign({
          members: [
            encodeMember('member-1', { 'topic-A': claimed }),
            encodeMember('member-2', { 'topic-A': 1 }),
          ],
          topics,
        });

        expect(assignment).toEqual([
          { memberId: 'member-1', memberAssignment: encodeAssignment([0]) },
          { memberId: 'member-2', memberAssignment: encodeAssignment([1]) },
        ]);
      },
    );
  });

  describe('protocol', () => {
    it('returns the assigner name and metadata', async () => {
      // set previous assignments
      client.consumerAssignments = {
        'topic-A': 0,
        'topic-B': 1,
      };

      const protocol = await assigner.protocol({ topics });

      expect(getPreviousAssignment).toHaveBeenCalledOnce();
      expect(getConsumerAssignments).toHaveBeenCalledOnce();

      expect(protocol).toEqual({
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
