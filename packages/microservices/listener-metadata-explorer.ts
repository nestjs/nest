import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { isFunction, isUndefined } from '@nestjs/common/utils/shared.utils';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import {
  CLIENT_CONFIGURATION_METADATA,
  CLIENT_METADATA,
  PATTERN_EXTRAS_METADATA,
  PATTERN_HANDLER_METADATA,
  PATTERN_METADATA,
  TRANSPORT_METADATA,
} from './constants';
import { Transport } from './enums';
import { PatternHandler } from './enums/pattern-handler.enum';
import { ClientOptions, PatternMetadata } from './interfaces';

export interface ClientProperties {
  property: string;
  metadata: ClientOptions;
}

export interface EventOrMessageListenerDefinition {
  patterns: PatternMetadata[];
  methodKey: string;
  isEventHandler: boolean;
  targetCallback: (...args: any[]) => any;
  transport?: Transport;
  extras?: Record<string, any>;
}

export interface MessageRequestProperties {
  requestPattern: PatternMetadata;
  replyPattern: PatternMetadata;
}

export class ListenerMetadataExplorer {
  constructor(private readonly metadataScanner: MetadataScanner) {}

  public explore(instance: Controller): EventOrMessageListenerDefinition[] {
    const instancePrototype = Object.getPrototypeOf(instance);
    return this.metadataScanner
      .getAllMethodNames(instancePrototype)
      .map(method => this.exploreMethodMetadata(instancePrototype, method))
      .filter(metadata => metadata);
  }

  public exploreMethodMetadata(
    instancePrototype: object,
    methodKey: string,
  ): EventOrMessageListenerDefinition {
    const targetCallback = instancePrototype[methodKey];
    const handlerType = Reflect.getMetadata(
      PATTERN_HANDLER_METADATA,
      targetCallback,
    );
    if (isUndefined(handlerType)) {
      return;
    }
    const patterns = Reflect.getMetadata(PATTERN_METADATA, targetCallback);
    const transport = Reflect.getMetadata(TRANSPORT_METADATA, targetCallback);
    const extras = Reflect.getMetadata(PATTERN_EXTRAS_METADATA, targetCallback);
    return {
      methodKey,
      targetCallback,
      patterns,
      transport,
      extras,
      isEventHandler: handlerType === PatternHandler.EVENT,
    };
  }

  public *scanForClientHooks(
    instance: Controller,
  ): IterableIterator<ClientProperties> {
    for (const propertyKey in instance) {
      if (isFunction(propertyKey)) {
        continue;
      }
      const property = String(propertyKey);
      const isClient = Reflect.getMetadata(CLIENT_METADATA, instance, property);
      if (isUndefined(isClient)) {
        continue;
      }
      const metadata = Reflect.getMetadata(
        CLIENT_CONFIGURATION_METADATA,
        instance,
        property,
      );
      yield { property, metadata };
    }
  }
}
