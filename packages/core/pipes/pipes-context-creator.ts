import { PIPES_METADATA } from '@nestjs/common/constants';
import {
  Controller,
  PipeTransform,
  Transform,
} from '@nestjs/common/interfaces';
import {
  isEmpty,
  isFunction,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';
import { ApplicationConfig } from '../application-config';
import { ContextCreator } from '../helpers/context-creator';
import { NestContainer } from '../injector/container';

export class PipesContextCreator extends ContextCreator {
  private moduleContext: string;

  constructor(
    private readonly container: NestContainer,
    private readonly config?: ApplicationConfig,
  ) {
    super();
  }

  public create(
    instance: Controller,
    callback: (...args: any[]) => any,
    module: string,
  ): Transform<any>[] {
    this.moduleContext = module;
    return this.createContext(instance, callback, PIPES_METADATA);
  }

  public createConcreteContext<T extends any[], R extends any[]>(
    metadata: T,
  ): R {
    if (isEmpty(metadata)) {
      return [] as R;
    }
    return iterate(metadata)
      .filter((pipe: any) => pipe && (pipe.name || pipe.transform))
      .map(pipe => this.getPipeInstance(pipe))
      .filter(pipe => pipe && pipe.transform && isFunction(pipe.transform))
      .map(pipe => pipe.transform.bind(pipe))
      .toArray() as R;
  }

  public getPipeInstance(pipe: Function | PipeTransform) {
    const isObject = (pipe as PipeTransform).transform;
    if (isObject) {
      return pipe;
    }
    const instanceWrapper = this.getInstanceByMetatype(pipe as Function);
    return instanceWrapper && instanceWrapper.instance
      ? instanceWrapper.instance
      : null;
  }

  public getInstanceByMetatype<T extends { name: string } = any>(
    metatype: T,
  ): { instance: any } | undefined {
    if (!this.moduleContext) {
      return undefined;
    }
    const collection = this.container.getModules();
    const module = collection.get(this.moduleContext);
    if (!module) {
      return undefined;
    }
    return module.injectables.get(metatype.name);
  }

  public getGlobalMetadata<T extends any[]>(): T {
    if (!this.config) {
      return [] as T;
    }
    return this.config.getGlobalPipes() as T;
  }

  public setModuleContext(context: string) {
    this.moduleContext = context;
  }
}
