import { InjectorDependencyContext } from '../../injector/injector';

export interface SerializedGraphMetadata {
  cause: {
    type: 'unknown-dependencies' | 'unknown';
    context?: InjectorDependencyContext;
    moduleId?: string;
    nodeId?: string;
    error?: any;
  };
}
