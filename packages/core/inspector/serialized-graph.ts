import { InjectionToken } from '@nestjs/common';
import { ApplicationConfig } from '../application-config';
import { ExternalContextCreator } from '../helpers/external-context-creator';
import { HttpAdapterHost } from '../helpers/http-adapter-host';
import { INQUIRER } from '../injector/inquirer/inquirer-constants';
import { LazyModuleLoader } from '../injector/lazy-module-loader/lazy-module-loader';
import { ModuleRef } from '../injector/module-ref';
import { ModulesContainer } from '../injector/modules-container';
import { REQUEST } from '../router/request/request-constants';
import { Reflector } from '../services/reflector.service';
import { DeterministicUuidRegistry } from './deterministic-uuid-registry';
import { Edge } from './interfaces/edge.interface';
import { Entrypoint } from './interfaces/entrypoint.interface';
import {
  Extras,
  OrphanedEnhancerDefinition,
} from './interfaces/extras.interface';
import { Node } from './interfaces/node.interface';
import { SerializedGraphJson } from './interfaces/serialized-graph-json.interface';
import { SerializedGraphMetadata } from './interfaces/serialized-graph-metadata.interface';

export type SerializedGraphStatus = 'partial' | 'complete';
type WithOptionalId<T extends Record<'id', string>> = Omit<T, 'id'> &
  Partial<Pick<T, 'id'>>;

export class SerializedGraph {
  private readonly nodes = new Map<string, Node>();
  private readonly edges = new Map<string, Edge>();
  private readonly entrypoints = new Map<string, Entrypoint<unknown>[]>();
  private readonly extras: Extras = {
    orphanedEnhancers: [],
    attachedEnhancers: [],
  };
  private _status: SerializedGraphStatus = 'complete';
  private _metadata?: SerializedGraphMetadata;

  private static readonly INTERNAL_PROVIDERS: Array<InjectionToken> = [
    ApplicationConfig,
    ModuleRef,
    HttpAdapterHost,
    LazyModuleLoader,
    ExternalContextCreator,
    ModulesContainer,
    Reflector,
    SerializedGraph,
    HttpAdapterHost.name,
    Reflector.name,
    REQUEST,
    INQUIRER,
  ];

  set status(status: SerializedGraphStatus) {
    this._status = status;
  }

  set metadata(metadata: SerializedGraphMetadata) {
    this._metadata = metadata;
  }

  public insertNode(nodeDefinition: Node) {
    if (
      nodeDefinition.metadata.type === 'provider' &&
      SerializedGraph.INTERNAL_PROVIDERS.includes(nodeDefinition.metadata.token)
    ) {
      nodeDefinition.metadata = {
        ...nodeDefinition.metadata,
        internal: true,
      };
    }
    if (this.nodes.has(nodeDefinition.id)) {
      return this.nodes.get(nodeDefinition.id);
    }
    this.nodes.set(nodeDefinition.id, nodeDefinition);
    return nodeDefinition;
  }

  public insertEdge(edgeDefinition: WithOptionalId<Edge>) {
    if (
      edgeDefinition.metadata.type === 'class-to-class' &&
      (SerializedGraph.INTERNAL_PROVIDERS.includes(
        edgeDefinition.metadata.sourceClassToken,
      ) ||
        SerializedGraph.INTERNAL_PROVIDERS.includes(
          edgeDefinition.metadata.targetClassToken,
        ))
    ) {
      edgeDefinition.metadata = {
        ...edgeDefinition.metadata,
        internal: true,
      };
    }
    const id =
      edgeDefinition.id ?? this.generateUuidByEdgeDefinition(edgeDefinition);
    const edge = {
      ...edgeDefinition,
      id,
    };
    this.edges.set(id, edge);
    return edge;
  }

  public insertEntrypoint<T>(definition: Entrypoint<T>, parentId: string) {
    if (this.entrypoints.has(parentId)) {
      const existingCollection = this.entrypoints.get(parentId)!;
      existingCollection.push(definition);
    } else {
      this.entrypoints.set(parentId, [definition]);
    }
  }

  public insertOrphanedEnhancer(entry: OrphanedEnhancerDefinition) {
    this.extras.orphanedEnhancers.push(entry);
  }

  public insertAttachedEnhancer(nodeId: string) {
    this.extras.attachedEnhancers.push({
      nodeId,
    });
  }

  public getNodeById(id: string) {
    return this.nodes.get(id);
  }

  public toJSON(): SerializedGraphJson {
    const json: SerializedGraphJson = {
      nodes: Object.fromEntries(this.nodes),
      edges: Object.fromEntries(this.edges),
      entrypoints: Object.fromEntries(this.entrypoints),
      extras: this.extras,
    };

    if (this._status) {
      json['status'] = this._status;
    }
    if (this._metadata) {
      json['metadata'] = this._metadata;
    }
    return json;
  }

  public toString() {
    const replacer = (key: string, value: unknown) => {
      if (typeof value === 'symbol') {
        return value.toString();
      }
      return typeof value === 'function' ? (value.name ?? 'Function') : value;
    };
    return JSON.stringify(this.toJSON(), replacer, 2);
  }

  private generateUuidByEdgeDefinition(
    edgeDefinition: WithOptionalId<Edge>,
  ): string {
    return DeterministicUuidRegistry.get(JSON.stringify(edgeDefinition));
  }
}
