import { InjectionToken } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ApplicationConfig } from '../application-config';
import { ExternalContextCreator } from '../helpers/external-context-creator';
import { HttpAdapterHost } from '../helpers/http-adapter-host';
import { INQUIRER } from '../injector/inquirer/inquirer-constants';
import { LazyModuleLoader } from '../injector/lazy-module-loader/lazy-module-loader';
import { ModuleRef } from '../injector/module-ref';
import { ModulesContainer } from '../injector/modules-container';
import { REQUEST } from '../router/request/request-constants';
import { Reflector } from '../services/reflector.service';
import { Edge } from './interfaces/edge.interface';
import { Entrypoint } from './interfaces/entrypoint.interface';
import {
  Extras,
  OrphanedEnhancerDefinition,
} from './interfaces/extras.interface';
import { Node } from './interfaces/node.interface';

const INTERNAL_PROVIDERS: Array<InjectionToken> = [
  ApplicationConfig,
  ModuleRef,
  HttpAdapterHost,
  LazyModuleLoader,
  ExternalContextCreator,
  ModulesContainer,
  Reflector,
  HttpAdapterHost.name,
  Reflector.name,
  REQUEST,
  INQUIRER,
];

type WithOptionalId<T extends Record<'id', string>> = Omit<T, 'id'> &
  Partial<Pick<T, 'id'>>;

export class SerializedGraph {
  private readonly nodes = new Map<string, Node>();
  private readonly edges = new Map<string, Edge>();
  private readonly entrypoints = new Set<Entrypoint<unknown>>();
  private readonly extras: Extras = {
    orphanedEnhancers: [],
    attachedEnhancers: [],
  };

  public insertNode(nodeDefinition: Node) {
    if (
      nodeDefinition.metadata.type === 'provider' &&
      INTERNAL_PROVIDERS.includes(nodeDefinition.metadata.token)
    ) {
      nodeDefinition.metadata = {
        ...nodeDefinition.metadata,
        internal: true,
      };
    }
    this.nodes.set(nodeDefinition.id, nodeDefinition);
    return nodeDefinition;
  }

  public insertEdge(edgeDefinition: WithOptionalId<Edge>) {
    if (
      edgeDefinition.metadata.type === 'class-to-class' &&
      (INTERNAL_PROVIDERS.includes(edgeDefinition.metadata.sourceClassToken) ||
        INTERNAL_PROVIDERS.includes(edgeDefinition.metadata.targetClassToken))
    ) {
      edgeDefinition.metadata = {
        ...edgeDefinition.metadata,
        internal: true,
      };
    }
    const id = edgeDefinition.id ?? randomUUID();
    const edge = {
      ...edgeDefinition,
      id,
    };
    this.edges.set(id, edge);
    return edge;
  }

  public insertEntrypoint<T>(definition: Entrypoint<T>) {
    this.entrypoints.add(definition);
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
}
