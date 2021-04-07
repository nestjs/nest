import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isUndefined } from '@nestjs/common/utils/shared.utils';

import { ClientKafka } from '../client/client-kafka';
import {
  Cluster,
  GroupMember,
  GroupMemberAssignment,
  GroupState,
  MemberMetadata,
} from '../external/kafka.interface';

let kafkaPackage: any = {};

export class KafkaReplyPartitionAssigner {
  readonly name = 'NestReplyPartitionAssigner';
  readonly version = 1;

  constructor(
    private readonly clientKafka: ClientKafka,
    private readonly config: {
      cluster: Cluster;
    },
  ) {
    kafkaPackage = loadPackage(
      'kafkajs',
      KafkaReplyPartitionAssigner.name,
      () => require('kafkajs'),
    );
  }

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
    const assignment = {};
    const previousAssignment = {};

    const membersCount = group.members.length;
    const decodedMembers = group.members.map(member =>
      this.decodeMember(member),
    );
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

    // build a collection of topics and partitions
    const topicsPartitions = group.topics
      .map(topic => {
        const partitionMetadata = this.config.cluster.findTopicPartitionMetadata(
          topic,
        );
        return partitionMetadata.map(m => {
          return {
            topic,
            partitionId: m.partitionId,
          };
        });
      })
      .reduce((acc, val) => acc.concat(val), []);

    // create the new assignment by populating the members with the first partition of the topics
    sortedMemberIds.forEach(assignee => {
      if (!assignment[assignee]) {
        assignment[assignee] = {};
      }

      // add topics to each member
      group.topics.forEach(topic => {
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

          // create the assignment with the first partition
          assignment[assignee][topic].push(firstPartition);

          // find and remove this topic and partition from the topicPartitions to be assigned later
          const topicsPartitionsIndex = topicsPartitions.findIndex(
            topicPartition => {
              return (
                topicPartition.topic === topic &&
                topicPartition.partitionId === firstPartition
              );
            },
          );

          // only continue if we found a partition matching this topic
          if (topicsPartitionsIndex !== -1) {
            // remove inline
            topicsPartitions.splice(topicsPartitionsIndex, 1);
          }
        }
      });
    });

    // check for member topics that have a partition length of 0
    sortedMemberIds.forEach(assignee => {
      group.topics.forEach(topic => {
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

    // encode the end result
    return Object.keys(assignment).map(memberId => ({
      memberId,
      memberAssignment: kafkaPackage.AssignerProtocol.MemberAssignment.encode({
        version: this.version,
        assignment: assignment[memberId],
      }),
    }));
  }

  public protocol(subscription: {
    topics: string[];
    userData: Buffer;
  }): GroupState {
    const stringifiedUserData = JSON.stringify({
      previousAssignment: this.getPreviousAssignment(),
    });
    subscription.userData = Buffer.from(stringifiedUserData);

    return {
      name: this.name,
      metadata: kafkaPackage.AssignerProtocol.MemberMetadata.encode({
        version: this.version,
        topics: subscription.topics,
        userData: subscription.userData,
      }),
    };
  }

  public getPreviousAssignment() {
    return this.clientKafka.getConsumerAssignments();
  }

  public decodeMember(member: GroupMember) {
    const memberMetadata = kafkaPackage.AssignerProtocol.MemberMetadata.decode(
      member.memberMetadata,
    ) as MemberMetadata;
    const memberUserData = JSON.parse(memberMetadata.userData.toString());

    return {
      memberId: member.memberId,
      previousAssignment: memberUserData.previousAssignment,
    };
  }
}
