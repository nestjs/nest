import { InjectionToken, Scope } from '@nestjs/common';

export type ModuleNode = {
  metadata: {
    type: 'module';
    global: boolean;
    dynamic: boolean;
  };
};

export type ClassNode = {
  parent: string;
  metadata: {
    type: 'provider' | 'controller' | 'middleware' | 'injectable';
    sourceModuleName: string;
    durable: boolean;
    static: boolean;
    transient: boolean;
    scope: Scope;
    token: InjectionToken;
    /**
     * Enhancers metadata collection
     */
    enhancers?: Array<{ id: string } | { name: string; methodKey?: string }>;
    /**
     * Order in which globally registered enhancers are applied
     */
    enhancerRegistrationOrder?: number;
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
