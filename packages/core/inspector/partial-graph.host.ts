import { SerializedGraph } from './serialized-graph';

export class PartialGraphHost {
  private static partialGraph: SerializedGraph;

  static toJSON() {
    return this.partialGraph?.toJSON();
  }

  static toString() {
    return this.partialGraph?.toString();
  }

  static register(partialGraph: SerializedGraph) {
    this.partialGraph = partialGraph;
  }
}
