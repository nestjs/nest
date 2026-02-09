import { isFunction, isUndefined } from '@nestjs/common/utils/shared.utils.js';
import { MetadataScanner } from '@nestjs/core/metadata-scanner.js';
import { Observable } from 'rxjs';
import {
  GATEWAY_SERVER_METADATA,
  MESSAGE_MAPPING_METADATA,
  MESSAGE_METADATA,
  PARAM_ARGS_METADATA,
} from './constants.js';
import { NestGateway } from './interfaces/nest-gateway.interface.js';
import { ParamsMetadata } from '@nestjs/core/helpers/interfaces/index.js';
import { WsParamtype } from './enums/ws-paramtype.enum.js';
import { ContextUtils } from '@nestjs/core/helpers/context-utils.js';

export interface MessageMappingProperties {
  message: any;
  methodName: string;
  callback: (...args: any[]) => Observable<any> | Promise<any>;
  isAckHandledManually: boolean;
}

export class GatewayMetadataExplorer {
  private readonly contextUtils = new ContextUtils();
  constructor(private readonly metadataScanner: MetadataScanner) {}

  public explore(instance: NestGateway): MessageMappingProperties[] {
    const instancePrototype = Object.getPrototypeOf(instance);
    return this.metadataScanner
      .getAllMethodNames(instancePrototype)
      .map(method => this.exploreMethodMetadata(instancePrototype, method)!)
      .filter(metadata => metadata);
  }

  public exploreMethodMetadata(
    instancePrototype: object,
    methodName: string,
  ): MessageMappingProperties | null {
    const callback = instancePrototype[methodName];
    const isMessageMapping = Reflect.getMetadata(
      MESSAGE_MAPPING_METADATA,
      callback,
    );
    if (isUndefined(isMessageMapping)) {
      return null;
    }
    const message = Reflect.getMetadata(MESSAGE_METADATA, callback);
    const isAckHandledManually = this.hasAckDecorator(
      instancePrototype,
      methodName,
    );

    return {
      callback,
      message,
      methodName,
      isAckHandledManually,
    };
  }

  private hasAckDecorator(
    instancePrototype: object,
    methodName: string,
  ): boolean {
    const paramsMetadata: ParamsMetadata = Reflect.getMetadata(
      PARAM_ARGS_METADATA,
      instancePrototype.constructor,
      methodName,
    );

    if (!paramsMetadata) {
      return false;
    }
    const metadataKeys = Object.keys(paramsMetadata);
    return metadataKeys.some(key => {
      const type = this.contextUtils.mapParamType(key);

      return (Number(type) as WsParamtype) === WsParamtype.ACK;
    });
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
