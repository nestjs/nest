import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { Cluster, GroupMember, MemberMetadata, GroupMemberAssignment, GroupState } from '../external/kafka.interface';

const kafkaPackage = loadPackage('kafkajs', 'RoundRobinByTimestampPartitionAssigner', () => require('kafkajs'));
const time = process.hrtime();

export const KafkaRoundRobinByTimePartitionAssigner: any = (config: {cluster: Cluster}) => ({
  name: 'RoundRobinByTime',
  version: 1,
  /**
   * This process can result in imbalanced assignments
   * @param {array} members array of members, e.g: [{ memberId: 'test-5f93f5a3' }]
   * @param {array} topics
   * @param {Buffer} userData
   * @returns {array} object partitions per topic per member
   */
  async assign(group: {
    members: GroupMember[]
    topics: string[]
    userData: Buffer
  }): Promise<GroupMemberAssignment[]> {
    const membersCount = group.members.length;
    const assignment = {};

    // sort the members by time
    const sortedMembers = group.members.map((member) => {
      // parse the metadata and user data
      const memberMetadata = kafkaPackage.AssignerProtocol.MemberMetadata.decode(member.memberMetadata) as MemberMetadata;
      const memberUserData = JSON.parse(memberMetadata.userData.toString());

      return {
        memberId: member.memberId,
        time: memberUserData.time
      };
    }).sort((a, b) => {
      // if seconds are equal sort by nanoseconds
      if (a.time[0] === b.time[0]) {
        return a.time[1] - b.time[1];
      }

      // sort by seconds
      return a.time[0] - b.time[0];
    }).map((member) => {
      // member id
      return member.memberId;
    });

    sortedMembers.forEach(memberId => {
      assignment[memberId] = {};
    });

    group.topics.forEach(topic => {
      const partitionMetadata = config.cluster.findTopicPartitionMetadata(topic);
      const partitions = partitionMetadata.map(m => m.partitionId);
      sortedMembers.forEach((memberId, i) => {
        if (!assignment[memberId][topic]) {
          assignment[memberId][topic] = [];
        }

        assignment[memberId][topic].push(...partitions.filter(id => id % membersCount === i));
      });
    });

    return Object.keys(assignment).map(memberId => ({
      memberId,
      memberAssignment: kafkaPackage.AssignerProtocol.MemberAssignment.encode({
        version: this.version,
        assignment: assignment[memberId],
        userData: group.userData
      }),
    }));
  },
  protocol(subscription: { topics: string[]; userData: Buffer }): GroupState {
    subscription.userData = Buffer.from(JSON.stringify({time}));

    return {
      name: this.name,
      metadata: kafkaPackage.AssignerProtocol.MemberMetadata.encode({
        version: this.version,
        topics: subscription.topics,
        userData: subscription.userData,
      }),
    };
  }
});