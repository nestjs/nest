import { ClientKafka } from '../client/client-kafka.js';
import {
  Cluster,
  GroupMember,
  GroupMemberAssignment,
  GroupState,
  MemberMetadata,
} from '../external/kafka.interface.js';
import { loadPackageCached, isUndefined } from '@nestjs/common/internal';

/**
 * kafkajs, which ClientKafka loads (createClient()) before it runs on it. On
 * `@platformatic/kafka`, which encodes the group protocol itself, the
 * assigner never loads it.
 */
function loadKafkajs() {
  return loadPackageCached('kafkajs', KafkaReplyPartitionAssigner.name);
}

/** The partitions a member gets of each topic, by member id. */
type ReplyPartitionAssignment = Record<string, Record<string, number[]>>;

export class KafkaReplyPartitionAssigner {
  readonly name = 'NestReplyPartitionAssigner';
  readonly version = 1;

  constructor(
    private readonly clientKafka: ClientKafka,
    // kafkajs passes it; `@platformatic/kafka` passes the partitions of the
    // topics to `assignPartitions()` instead
    private readonly config?: {
      cluster: Cluster;
    },
  ) {}

  /**
   * This process can result in imbalanced assignments
   * @param {array} members array of members, e.g: [{ memberId: 'test-5f93f5a3' }]
   * @param {array} topics
   * @param {Buffer} userData
   * @returns {array} object partitions per topic per member
   */
  public async assign(group: {
    members: GroupMember[];
    topics: string[];
  }): Promise<GroupMemberAssignment[]> {
    const cluster = this.config?.cluster;
    if (!cluster) {
      throw new Error('The assigner needs the cluster to assign partitions');
    }
    // build a collection of topics and partitions
    const topicsPartitions = group.topics.flatMap(topic => {
      const partitionMetadata = cluster.findTopicPartitionMetadata(topic);
      return partitionMetadata.map(m => ({
        topic,
        partitionId: m.partitionId,
      }));
    });
    const assignment = this.createAssignment(
      group.members.map(member => this.decodeMember(member)),
      group.topics,
      topicsPartitions,
    );

    // encode the end result
    const { AssignerProtocol } = loadKafkajs();
    return Object.keys(assignment).map(memberId => ({
      memberId,
      memberAssignment: AssignerProtocol.MemberAssignment.encode({
        version: this.version,
        assignment: assignment[memberId],
      }),
    }));
  }

  /**
   * Assigns the partitions of the topics to the members on
   * `@platformatic/kafka`, which decodes the members itself and expects the
   * assignment synchronously. A member keeps the partition it had of a topic
   * before, which its user data holds (see `getUserData`).
   */
  public assignPartitions(
    members: { memberId: string; userData?: Buffer | string | null }[],
    topics: readonly string[],
    topicsPartitions: { topic: string; partitionId: number }[],
  ): ReplyPartitionAssignment {
    return this.createAssignment(
      members.map(({ memberId, userData }) => ({
        memberId,
        previousAssignment: this.decodePreviousAssignment(userData),
      })),
      topics,
      topicsPartitions,
    );
  }

  private createAssignment(
    decodedMembers: {
      memberId: string;
      previousAssignment: Record<string, unknown>;
    }[],
    topics: readonly string[],
    topicsPartitions: { topic: string; partitionId: number }[],
  ): ReplyPartitionAssignment {
    const assignment: ReplyPartitionAssignment = {};
    const previousAssignment = {};

    const membersCount = decodedMembers.length;
    const sortedMemberIds = decodedMembers
      .map(member => member.memberId)
      .sort();

    // build the previous assignment and an inverse map of topic > partition > memberId for lookup
    decodedMembers.forEach(member => {
      if (
        !previousAssignment[member.memberId] &&
        Object.keys(member.previousAssignment).length > 0
      ) {
        previousAssignment[member.memberId] = member.previousAssignment;
      }
    });

    // create the new assignment by populating the members with the first partition of the topics
    sortedMemberIds.forEach(assignee => {
      if (!assignment[assignee]) {
        assignment[assignee] = {};
      }

      // add topics to each member
      topics.forEach(topic => {
        if (!assignment[assignee][topic]) {
          assignment[assignee][topic] = [];
        }

        // see if the topic and partition belong to a previous assignment
        if (
          previousAssignment[assignee] &&
          !isUndefined(previousAssignment[assignee][topic])
        ) {
          // take the minimum partition since replies will be sent to the minimum partition
          const firstPartition = previousAssignment[assignee][topic];

          // find and remove this topic and partition from the topicPartitions to be assigned later
          const topicsPartitionsIndex = topicsPartitions.findIndex(
            topicPartition => {
              return (
                topicPartition.topic === topic &&
                topicPartition.partitionId === firstPartition
              );
            },
          );

          // only keep a partition that exists and is not taken yet, otherwise
          // the member gets a free partition below
          if (topicsPartitionsIndex !== -1) {
            // create the assignment with the first partition
            assignment[assignee][topic].push(firstPartition);
            // remove inline
            topicsPartitions.splice(topicsPartitionsIndex, 1);
          }
        }
      });
    });

    // check for member topics that have a partition length of 0
    sortedMemberIds.forEach(assignee => {
      topics.forEach(topic => {
        // only continue if there are no partitions for assignee's topic
        if (assignment[assignee][topic].length === 0) {
          // find the first partition for this topic
          const topicsPartitionsIndex = topicsPartitions.findIndex(
            topicPartition => {
              return topicPartition.topic === topic;
            },
          );

          if (topicsPartitionsIndex !== -1) {
            // find and set the topic partition
            const partition =
              topicsPartitions[topicsPartitionsIndex].partitionId;

            assignment[assignee][topic].push(partition);

            // remove this partition from the topics partitions collection
            topicsPartitions.splice(topicsPartitionsIndex, 1);
          }
        }
      });
    });

    // then balance out the rest of the topic partitions across the members
    const insertAssignmentsByTopic = (topicPartition, i) => {
      const assignee = sortedMemberIds[i % membersCount];

      assignment[assignee][topicPartition.topic].push(
        topicPartition.partitionId,
      );
    };

    // build the assignments
    topicsPartitions.forEach(insertAssignmentsByTopic);

    return assignment;
  }

  public protocol(subscription: {
    topics: string[];
    userData: Buffer;
  }): GroupState {
    subscription.userData = this.getUserData();

    return {
      name: this.name,
      metadata: loadKafkajs().AssignerProtocol.MemberMetadata.encode({
        version: this.version,
        topics: subscription.topics,
        userData: subscription.userData,
      }),
    };
  }

  /**
   * The user data of the member: the partitions it has of each topic, which
   * it keeps when the group rebalances.
   */
  public getUserData(): Buffer {
    return Buffer.from(
      JSON.stringify({ previousAssignment: this.getPreviousAssignment() }),
    );
  }

  public getPreviousAssignment() {
    return this.clientKafka.getConsumerAssignments();
  }

  public decodeMember(member: GroupMember) {
    let memberMetadata: MemberMetadata;
    try {
      memberMetadata = loadKafkajs().AssignerProtocol.MemberMetadata.decode(
        member.memberMetadata,
      ) as MemberMetadata;
    } catch {
      return { memberId: member.memberId, previousAssignment: {} };
    }

    return {
      memberId: member.memberId,
      previousAssignment: this.decodePreviousAssignment(
        memberMetadata.userData,
      ),
    };
  }

  /**
   * The metadata carried by a group member is chosen by that member, so it is
   * parsed defensively: malformed or missing data must not make the rebalance
   * fail, as a group that never stabilizes leaves the client unable to consume
   * replies. Anything that is not a `previousAssignment` record degrades to an
   * empty assignment (the member is then treated as new).
   */
  private decodePreviousAssignment(
    userData: Buffer | string | null | undefined,
  ): Record<string, unknown> {
    const rawUserData = userData?.toString();
    if (!rawUserData) {
      return {};
    }
    try {
      const previousAssignment = (
        JSON.parse(rawUserData) as { previousAssignment?: unknown }
      )?.previousAssignment;
      return previousAssignment &&
        typeof previousAssignment === 'object' &&
        !Array.isArray(previousAssignment)
        ? (previousAssignment as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
}
