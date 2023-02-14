import { isFunction, isUndefined } from '@nestjs/common/utils/shared.utils';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { Observable } from 'rxjs';
import {
  GATEWAY_SERVER_METADATA,
  MESSAGE_MAPPING_METADATA,
  MESSAGE_METADATA,
} from './constants';
import { NestGateway } from './interfaces/nest-gateway.interface';

export interface MessageMappingProperties {
  message: any;
  methodName: string;
  callback: (...args: any[]) => Observable<any> | Promise<any> | any;
}

export class GatewayMetadataExplorer {
  constructor(private readonly metadataScanner: MetadataScanner) {}

  public explore(instance: NestGateway): MessageMappingProperties[] {
    const instancePrototype = Object.getPrototypeOf(instance);
    return this.metadataScanner
      .getAllMethodNames(instancePrototype)
      .map(method => this.exploreMethodMetadata(instancePrototype, method))
      .filter(metadata => metadata);
  }

  public exploreMethodMetadata(
    instancePrototype: object,
    methodName: string,
  ): MessageMappingProperties {
    const callback = instancePrototype[methodName];
    const isMessageMapping = Reflect.getMetadata(
      MESSAGE_MAPPING_METADATA,
      callback,
    );
    if (isUndefined(isMessageMapping)) {
      return null;
    }
    const message = Reflect.getMetadata(MESSAGE_METADATA, callback);
    return {
      callback,
      message,
      methodName,
    };
  }

  public *scanForServerHooks(instance: NestGateway): IterableIterator<string> {
    for (const propertyKey in instance) {
      if (isFunction(propertyKey)) {
        continue;
      }
      const property = String(propertyKey);
      const isServer = Reflect.getMetadata(
        GATEWAY_SERVER_METADATA,
        instance,
        property,
      );
      if (!isUndefined(isServer)) {
        yield property;
      }
    }
  }
}
