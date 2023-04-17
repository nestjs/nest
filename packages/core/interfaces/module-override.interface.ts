import { ModuleDefinition } from './module-definition.interface';

export interface ModuleOverride {
  moduleToReplace: ModuleDefinition;
  newModule: ModuleDefinition;
}
