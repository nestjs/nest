import 'reflect-metadata';
import { PatternMetadata } from '../interfaces/pattern-metadata.interface';
/**
 * Subscribes to the messages, which fulfils chosen pattern.
 */
export declare const MessagePattern: (
  metadata?: string | PatternMetadata,
) => MethodDecorator;
