import { BaseMetadataStorage, Provider, Type, Utils } from '@nest/core';

import {
  ControllerMetadata,
  HeaderMetadata,
  HttpCodeMetadata,
  RequestMappingMetadata,
} from './interfaces';

export type Target = Type<Provider> | Function;

export class MetadataStorage extends BaseMetadataStorage {
  static readonly requestMapping = new Set<RequestMappingMetadata>();
  static readonly controllers = new Set<ControllerMetadata>();
  static readonly httpCodes = new Set<HttpCodeMetadata>();
  static readonly headers = new Set<HeaderMetadata>();

  static clear() {
    this.requestMapping.clear();
    this.controllers.clear();
    this.httpCodes.clear();
    this.headers.clear();
  }

  static getHeaders(target: Target, propertyKey?: string | symbol) {
    return this.filterByTargetProperty(this.headers, target, propertyKey);
  }

  static getHttpCodes(target: Target, propertyKey?: string | symbol) {
    return this.filterByTargetProperty(this.httpCodes, target, propertyKey);
  }

  static getRequestMapping(
    target: Target,
    methodName?: string,
  ): RequestMappingMetadata & RequestMappingMetadata[] {
    return !Utils.isNil(methodName)
      ? this.findByTargetProperty(this.requestMapping, target, methodName)
      : this.filterByTarget(this.requestMapping, target);
  }

  static getController(target: Target) {
    return this.findByTarget(this.controllers, target);
  }
}
