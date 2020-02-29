import { ParamData } from '@nestjs/common';
import { PARAMTYPES_METADATA } from '@nestjs/common/constants';
import { Controller, PipeTransform } from '@nestjs/common/interfaces';
import { isFunction } from '@nestjs/common/utils/shared.utils';

export interface ParamProperties<T = any, IExtractor extends Function = any> {
  index: number;
  type: T | string;
  data: ParamData;
  pipes: PipeTransform[];
  extractValue: IExtractor;
}

export class ContextUtils {
  public mapParamType(key: string): string {
    const keyPair = key.split(':');
    return keyPair[0];
  }

  public reflectCallbackParamtypes(
    instance: Controller,
    methodName: string,
  ): any[] {
    return Reflect.getMetadata(PARAMTYPES_METADATA, instance, methodName);
  }

  public reflectCallbackMetadata<T = any>(
    instance: Controller,
    methodName: string,
    metadataKey: string,
  ): T {
    return Reflect.getMetadata(metadataKey, instance.constructor, methodName);
  }

  public getArgumentsLength<T>(keys: string[], metadata: T): number {
    return Math.max(...keys.map(key => metadata[key].index)) + 1;
  }

  public createNullArray(length: number): any[] {
    // eslint-disable-next-line prefer-spread
    return Array.apply(null, { length } as any).fill(undefined);
  }

  public mergeParamsMetatypes(
    paramsProperties: ParamProperties[],
    paramtypes: any[],
  ): (ParamProperties & { metatype?: any })[] {
    if (!paramtypes) {
      return paramsProperties;
    }
    return paramsProperties.map(param => ({
      ...param,
      metatype: paramtypes[param.index],
    }));
  }

  public getCustomFactory(
    factory: (...args: unknown[]) => void,
    data: unknown,
  ): (...args: unknown[]) => unknown {
    return isFunction(factory)
      ? (...args: unknown[]) => factory(data, args)
      : () => null;
  }
}
