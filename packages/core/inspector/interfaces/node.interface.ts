import { InjectionToken, Scope } from '@nestjs/common';
import { EnhancerSubtype } from '@nestjs/common/constants';

export type ModuleNode = {
  metadata: {
    type: 'module';
    global: boolean;
    dynamic: boolean;
    internal: boolean;
  };
};

export type ClassNode = {
  parent: string;
  metadata: {
    type: 'provider' | 'controller' | 'middleware' | 'injectable';
    subtype?: EnhancerSubtype;
    sourceModuleName: string;
    durable: boolean;
    static: boolean;
    transient: boolean;
    exported: boolean;
    scope: Scope;
    token: InjectionToken;
    initTime: number;
    /**
     * Enhancers metadata collection
     */
    enhancers?: Array<
      | { id: string; subtype: EnhancerSubtype }
      | { name: string; methodKey?: string; subtype: EnhancerSubtype }
    >;
    /**
     * If true, node is a globally registered enhancer
     */
    global?: boolean;
    /**
     * If true, indicates that this node represents an internal provider
     */
    internal?: boolean;
  };
};

export type Node = {
  id: string;
  label: string;
} & (ClassNode | ModuleNode);
