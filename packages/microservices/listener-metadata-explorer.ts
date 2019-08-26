import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { isFunction, isUndefined } from '@nestjs/common/utils/shared.utils';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import {
  CLIENT_CONFIGURATION_METADATA,
  CLIENT_METADATA,
  PATTERN_HANDLER_METADATA,
  PATTERN_METADATA,
  REQUEST_PATTERN_METADATA,
  REPLY_PATTERN_METADATA,
} from './constants';
import { PatternHandler } from './enums/pattern-handler.enum';
import { ClientOptions } from './interfaces/client-metadata.interface';
import { PatternMetadata } from './interfaces/pattern-metadata.interface';

export interface ClientProperties {
  property: string;
  metadata: ClientOptions;
}

export interface PatternProperties {
  pattern: PatternMetadata;
  methodKey: string;
  isEventHandler: boolean;
  targetCallback: (...args: any[]) => any;
}

export interface MessageRequestProperties {
  requestPattern: PatternMetadata;
  replyPattern: PatternMetadata;
}

export class ListenerMetadataExplorer {
  constructor(private readonly metadataScanner: MetadataScanner) {}

  public explore(instance: Controller): PatternProperties[] {
    const instancePrototype = Object.getPrototypeOf(instance);
    return this.metadataScanner.scanFromPrototype<
      Controller,
      PatternProperties
    >(instance, instancePrototype, method =>
      this.exploreMethodMetadata(instancePrototype, method),
    );
  }

  public exploreMethodMetadata(
    instancePrototype: any,
    methodKey: string,
  ): PatternProperties {
    const targetCallback = instancePrototype[methodKey];
    const handlerType = Reflect.getMetadata(
      PATTERN_HANDLER_METADATA,
      targetCallback,
    );
    if (isUndefined(handlerType)) {
      return;
    }
    const pattern = Reflect.getMetadata(PATTERN_METADATA, targetCallback);
    return {
      methodKey,
      targetCallback,
      pattern,
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
