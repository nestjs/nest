import { PIPES_METADATA } from '@nestjs/common/constants';
import {
  Controller,
  PipeTransform,
  Transform,
} from '@nestjs/common/interfaces';
import { isEmpty, isFunction } from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';
import { ApplicationConfig } from '../application-config';
import { ContextCreator } from '../helpers/context-creator';
import { NestContainer } from '../injector/container';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { STATIC_CONTEXT } from './../injector/constants';

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
    contextId = STATIC_CONTEXT,
  ): Transform<any>[] {
    this.moduleContext = module;
    return this.createContext(instance, callback, PIPES_METADATA, contextId);
  }

  public createConcreteContext<T extends any[], R extends any[]>(
    metadata: T,
    contextId = STATIC_CONTEXT,
  ): R {
    if (isEmpty(metadata)) {
      return [] as R;
    }
    return iterate(metadata)
      .filter((pipe: any) => pipe && (pipe.name || pipe.transform))
      .map(pipe => this.getPipeInstance(pipe, contextId))
      .filter(pipe => pipe && pipe.transform && isFunction(pipe.transform))
      .map(pipe => pipe.transform.bind(pipe))
      .toArray() as R;
  }

  public getPipeInstance(
    pipe: Function | PipeTransform,
    contextId = STATIC_CONTEXT,
  ) {
    const isObject = (pipe as PipeTransform).transform;
    if (isObject) {
      return pipe;
    }
    const instanceWrapper = this.getInstanceByMetatype(pipe as Function);
    if (!instanceWrapper) {
      return null;
    }
    const instanceHost = instanceWrapper.getInstanceByContextId(contextId);
    return instanceHost && instanceHost.instance;
  }

  public getInstanceByMetatype<T extends { name: string } = any>(
    metatype: T,
  ): InstanceWrapper | undefined {
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
