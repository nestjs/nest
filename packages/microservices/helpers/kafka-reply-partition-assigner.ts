import { loadPackage } from '@nestjs/common/utils/load-package.util';
import {
  Cluster,
  GroupMember,
  GroupMemberAssignment,
  GroupState,
  MemberMetadata,
} from '../external/kafka.interface';

import { KafkaAssignmentStore } from './kafka-assignment-store';

let kafkaPackage: any = {};

export class KafkaReplyPartitionAssigner {
  readonly name = 'NestjsReplyPartitionAssigner';
  readonly version = 1;

  private readonly kafkaAssignmentStore = KafkaAssignmentStore.Instance;

  constructor(
    private readonly config: {
      groupId: string;
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
          previousAssignment[assignee][topic] &&
          previousAssignment[assignee][topic].length > 0
        ) {
          // take only the first partition since replies will be sent to the first partition
          const firstPartition = previousAssignment[assignee][topic][0];

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
        } else if (topicsPartitions.length > 0) {
          // find the first partition for this topic the is available
          const topicsPartitionsIndex = topicsPartitions.findIndex(
            topicPartition => {
              return topicPartition.topic === topic;
            },
          );

          // only continue if we found a partition matching this topic
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
    return this.kafkaAssignmentStore.get(this.config.groupId);
  }

  public decodeMember(member: GroupMember) {
    const memberMetadata = kafkaPackage.AssignerProtocol.MemberMetadata.decode(
      member.memberMetadata,
    ) as MemberMetadata;
    const memberUserData = JSON.parse(memberMetadata.userData.toString());

    // This should really be done while constructing userData within the protocol method
    // but the protocol method doesn't know anything about it's current member id.
    // only return the previous assignment for this user
    let previousAssignment = {};

    if (
      memberUserData.previousAssignment &&
      memberUserData.previousAssignment[member.memberId]
    ) {
      previousAssignment = memberUserData.previousAssignment[member.memberId];
    }

    return {
      memberId: member.memberId,
      previousAssignment,
    };
  }
}
