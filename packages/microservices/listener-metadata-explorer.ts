import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { isFunction, isUndefined } from '@nestjs/common/utils/shared.utils';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import {
  CLIENT_CONFIGURATION_METADATA,
  CLIENT_METADATA,
  PATTERN_HANDLER_METADATA,
  PATTERN_METADATA,
  TRANSPORT_METADATA,
} from './constants';
import { Transport } from './enums';
import { PatternHandler } from './enums/pattern-handler.enum';
import { ClientOptions } from './interfaces/client-metadata.interface';
import { PatternMetadata } from './interfaces/pattern-metadata.interface';

export interface ClientProperties {
  property: string;
  metadata: ClientOptions;
}

export interface EventOrMessageListenerDefinition {
  pattern: PatternMetadata;
  methodKey: string;
  isEventHandler: boolean;
  targetCallback: (...args: any[]) => any;
  transport?: Transport;
}

export interface MessageRequestProperties {
  requestPattern: PatternMetadata;
  replyPattern: PatternMetadata;
}

export class ListenerMetadataExplorer {
  constructor(private readonly metadataScanner: MetadataScanner) {}

  public explore(instance: Controller): EventOrMessageListenerDefinition[] {
    const instancePrototype = Object.getPrototypeOf(instance);
    return this.metadataScanner.scanFromPrototype<
      Controller,
      EventOrMessageListenerDefinition
    >(instance, instancePrototype, method =>
      this.exploreMethodMetadata(instancePrototype, method),
    );
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
    const pattern = Reflect.getMetadata(PATTERN_METADATA, targetCallback);
    const transport = Reflect.getMetadata(TRANSPORT_METADATA, targetCallback);
    return {
      methodKey,
      targetCallback,
      pattern,
      transport,
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
