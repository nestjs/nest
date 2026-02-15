import { SerializedGraphStatus } from '../serialized-graph.js';
import { Edge } from './edge.interface.js';
import { Entrypoint } from './entrypoint.interface.js';
import { Extras } from './extras.interface.js';
import { Node } from './node.interface.js';
import { SerializedGraphMetadata } from './serialized-graph-metadata.interface.js';

export interface SerializedGraphJson {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  entrypoints: Record<string, Entrypoint<unknown>[]>;
  extras: Extras;
  status?: SerializedGraphStatus;
  metadata?: SerializedGraphMetadata;
}
