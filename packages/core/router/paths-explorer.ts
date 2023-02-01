import {
  METHOD_METADATA,
  PATH_METADATA,
  VERSION_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import {
  VersioningOptions,
  VersionValue,
} from '@nestjs/common/interfaces/version-options.interface';
import {
  addLeadingSlash,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { MetadataScanner } from '../metadata-scanner';
import { RouterProxyCallback } from './router-proxy';

export interface RouteDefinition {
  path: string[];
  requestMethod: RequestMethod;
  targetCallback: RouterProxyCallback;
  methodName: string;
  version?: VersionValue;
}

export class PathsExplorer {
  constructor(
    private readonly metadataScanner: MetadataScanner,
    private readonly versioningOptions?: VersioningOptions,
  ) {}

  public scanForPaths(
    instance: Controller,
    prototype?: object,
  ): RouteDefinition[] {
    const instancePrototype = isUndefined(prototype)
      ? Object.getPrototypeOf(instance)
      : prototype;

    return this.metadataScanner.scanFromPrototype<Controller, RouteDefinition>(
      instance,
      instancePrototype,
      method => this.exploreMethodMetadata(instance, instancePrototype, method),
    );
  }

  public exploreMethodMetadata(
    instance: Controller,
    prototype: object,
    methodName: string,
  ): RouteDefinition {
    const instanceCallback = instance[methodName];
    const prototypeCallback = prototype[methodName];
    const routePath = Reflect.getMetadata(PATH_METADATA, prototypeCallback);
    if (isUndefined(routePath)) {
      return null;
    }
    const requestMethod: RequestMethod = Reflect.getMetadata(
      METHOD_METADATA,
      prototypeCallback,
    );
    const methodVersion: VersionValue | undefined = Reflect.getMetadata(
      VERSION_METADATA,
      prototypeCallback,
    );
    const controllerVersion: VersionValue | undefined = Reflect.getMetadata(
      VERSION_METADATA,
      prototype.constructor,
    );
    const path = isString(routePath)
      ? [addLeadingSlash(routePath)]
      : routePath.map((p: string) => addLeadingSlash(p));

    const globalVersion = this.versioningOptions?.defaultVersion;

    return {
      path,
      requestMethod,
      targetCallback: instanceCallback,
      methodName,
      version: methodVersion || controllerVersion || globalVersion,
    };
  }
}
