import { InjectionToken } from '@nestjs/common';

type CommonEdgeMetadata = {
  sourceModuleName: string;
  targetModuleName: string;
};

type ModuleToModuleEdgeMetadata = {
  type: 'module-to-module';
} & CommonEdgeMetadata;

type ClassToClassEdgeMetadata = {
  type: 'class-to-class';
  sourceClassName: string;
  targetClassName: string;
  sourceClassToken: InjectionToken;
  targetClassToken: InjectionToken;
  injectionType: 'constructor' | 'property' | 'decorator';
  keyOrIndex?: string | number | symbol;
  /**
   * If true, indicates that this edge represents an internal providers connection
   */
  internal?: boolean;
} & CommonEdgeMetadata;

export interface Edge {
  id: string;
  source: string;
  target: string;
  metadata: ModuleToModuleEdgeMetadata | ClassToClassEdgeMetadata;
}
