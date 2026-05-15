import { ModuleDefinition } from './module-definition.interface.js';

export interface ModuleOverride {
  moduleToReplace: ModuleDefinition;
  newModule: ModuleDefinition;
}
