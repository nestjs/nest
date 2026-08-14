import { Transport } from '../enums/index.js';
import { PatternMetadata } from './pattern-metadata.interface.js';

export type MicroserviceEntrypointMetadata = {
  transportId: keyof typeof Transport | symbol;
  patterns: PatternMetadata[];
  isEventHandler: boolean;
  extras?: Record<string, any>;
};
