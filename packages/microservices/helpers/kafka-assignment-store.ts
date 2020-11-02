export interface GroupMemberAssignment {
  [groupId: string]: MemberTopicAssignment;
}

export interface MemberTopicAssignment {
  [memberId: string]: TopicPartitionAssignment;
}

export interface TopicPartitionAssignment {
  [topic: string]: number[];
}

export class KafkaAssignmentStore {
  private static _instance: KafkaAssignmentStore;

  /**
   * groupId => memberId => topic => partitions[]
   */
  private store: GroupMemberAssignment = {};

  /**
   * Sets the member assignments from the group.
   *
   * @param groupId
   * @param memberId
   * @param assignments
   */
  public put(
    groupId: string,
    memberId: string,
    assignments: TopicPartitionAssignment,
  ): void {
    // make sure the group exists
    if (!this.store[groupId]) {
      this.store[groupId] = {};
    }

    // set the assignments
    this.store[groupId][memberId] = assignments;
  }

  /**
   * Gets the member assignments from the group.
   *
   * @param groupId
   */
  public get(groupId: string): MemberTopicAssignment {
    return this.store[groupId];
  }

  public static get Instance() {
    // Do you need arguments? Make it a regular static method instead.
    return this._instance || (this._instance = new this());
  }
}
