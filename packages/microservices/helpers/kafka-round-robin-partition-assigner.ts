import { loadPackage } from '@nestjs/common/utils/load-package.util';
import {
  Cluster,
  GroupMember,
  GroupMemberAssignment,
  GroupState,
  MemberMetadata,
} from '../external/kafka.interface';

let kafkaPackage: any = {};

const time = process.hrtime();

export class KafkaRoundRobinPartitionAssigner {
  readonly name = 'RoundRobinByTime';
  readonly version = 1;

  constructor(private readonly config: { cluster: Cluster }) {
    kafkaPackage = loadPackage(
      'kafkajs',
      KafkaRoundRobinPartitionAssigner.name,
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
    userData: Buffer;
  }): Promise<GroupMemberAssignment[]> {
    const membersCount = group.members.length;
    const assignment = {};

    const sortedMembers = group.members
      .map(member => this.mapToTimeAndMemberId(member))
      .sort((a, b) => this.sortByTime(a, b))
      .map(member => member.memberId);

    sortedMembers.forEach(memberId => {
      assignment[memberId] = {};
    });

    const insertAssignmentsByTopic = (topic: string) => {
      const partitionMetadata = this.config.cluster.findTopicPartitionMetadata(
        topic,
      );
      const partitions = partitionMetadata.map(m => m.partitionId);
      sortedMembers.forEach((memberId, i) => {
        if (!assignment[memberId][topic]) {
          assignment[memberId][topic] = [];
        }

        assignment[memberId][topic].push(
          ...partitions.filter(id => id % membersCount === i),
        );
      });
    };
    group.topics.forEach(insertAssignmentsByTopic);

    return Object.keys(assignment).map(memberId => ({
      memberId,
      memberAssignment: kafkaPackage.AssignerProtocol.MemberAssignment.encode({
        version: this.version,
        assignment: assignment[memberId],
        userData: group.userData,
      }),
    }));
  }

  public protocol(subscription: {
    topics: string[];
    userData: Buffer;
  }): GroupState {
    const stringifiedTimeObject = JSON.stringify({
      time: this.getTime(),
    });
    subscription.userData = Buffer.from(stringifiedTimeObject);
    return {
      name: this.name,
      metadata: kafkaPackage.AssignerProtocol.MemberMetadata.encode({
        version: this.version,
        topics: subscription.topics,
        userData: subscription.userData,
      }),
    };
  }

  public getTime(): [number, number] {
    return time;
  }

  public mapToTimeAndMemberId(member: GroupMember) {
    const memberMetadata = kafkaPackage.AssignerProtocol.MemberMetadata.decode(
      member.memberMetadata,
    ) as MemberMetadata;
    const memberUserData = JSON.parse(memberMetadata.userData.toString());

    return {
      memberId: member.memberId,
      time: memberUserData.time,
    };
  }

  public sortByTime(a: Record<'time', number[]>, b: Record<'time', number[]>) {
    // if seconds are equal sort by nanoseconds
    if (a.time[0] === b.time[0]) {
      return a.time[1] - b.time[1];
    }
    // sort by seconds
    return a.time[0] - b.time[0];
  }
}
