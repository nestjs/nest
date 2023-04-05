import { Transport } from '../enums';
import { PatternMetadata } from './pattern-metadata.interface';

export type MicroserviceEntrypointMetadata = {
  transportId: keyof typeof Transport | symbol;
  patterns: PatternMetadata[];
  isEventHandler: boolean;
  extras?: Record<string, any>;
};
