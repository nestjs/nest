import { SerializedGraphStatus } from '../serialized-graph';
import { Edge } from './edge.interface';
import { Entrypoint } from './entrypoint.interface';
import { Extras } from './extras.interface';
import { Node } from './node.interface';
import { SerializedGraphMetadata } from './serialized-graph-metadata.interface';

export interface SerializedGraphJson {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  entrypoints: Record<string, Entrypoint<unknown>[]>;
  extras: Extras;
  status?: SerializedGraphStatus;
  metadata?: SerializedGraphMetadata;
}
