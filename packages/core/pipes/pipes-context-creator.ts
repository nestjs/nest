import { PIPES_METADATA } from '@nestjs/common/constants';
import { Controller, PipeTransform, Type } from '@nestjs/common/interfaces';
import { isEmpty, isFunction } from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import { ApplicationConfig } from '../application-config';
import { assertEnhancer, describeEnhancer } from '../helpers/assert-enhancer';
import { ContextCreator } from '../helpers/context-creator';
import { STATIC_CONTEXT } from '../injector/constants';
import { NestContainer } from '../injector/container';
import { InstanceWrapper } from '../injector/instance-wrapper';

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
    callback: (...args: unknown[]) => unknown,
    moduleKey: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): PipeTransform[] {
    this.moduleContext = moduleKey;
    return this.createContext(
      instance,
      callback,
      PIPES_METADATA,
      contextId,
      inquirerId,
    );
  }

  public createConcreteContext<T extends any[], R extends any[]>(
    metadata: T,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): R {
    if (isEmpty(metadata)) {
      return [] as any[] as R;
    }
    return iterate(metadata)
      .filter(
        (pipe: any) => pipe && (isFunction(pipe) || isFunction(pipe.transform)),
      )
      .map(pipe => this.getPipeInstance(pipe, contextId, inquirerId))
      .filter(pipe => !!pipe && pipe.transform && isFunction(pipe.transform))
      .toArray() as R;
  }

  public getPipeInstance(
    pipe: Function | PipeTransform,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): PipeTransform | null {
    if (!isFunction(pipe)) {
      return pipe;
    }
    const instanceWrapper = this.getInstanceByMetatype(pipe as Type<unknown>);
    if (!instanceWrapper) {
      return this.pickEnhancer<PipeTransform>(pipe, null, 'transform');
    }
    const instanceHost = instanceWrapper.getInstanceByContextId(
      this.getContextId(contextId, instanceWrapper),
      inquirerId,
    );
    const enhancer = this.pickEnhancer<PipeTransform>(
      pipe,
      instanceHost && instanceHost.instance,
      'transform',
    );
    // Nest constructed the bound class, and neither the instance nor the
    // class can run as a pipe. A request-scoped or transient pipe outside of
    // its context is only a placeholder whose constructor never ran, and a
    // class that resolves to no provider (a host outside of every module)
    // is skipped as before.
    if (instanceHost?.isConstructorCalled) {
      assertEnhancer(enhancer, 'pipe', describeEnhancer(pipe));
    }
    return enhancer;
  }

  public getInstanceByMetatype(
    metatype: Type<unknown>,
  ): InstanceWrapper | undefined {
    if (!this.moduleContext) {
      return;
    }
    const collection = this.container.getModules();
    const moduleRef = collection.get(this.moduleContext);
    if (!moduleRef) {
      return;
    }
    return moduleRef.injectables.get(metatype);
  }

  public getGlobalMetadata<T extends unknown[]>(
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): T {
    if (!this.config) {
      return [] as unknown[] as T;
    }
    const globalPipes = this.config.getGlobalPipes() as T;
    if (contextId === STATIC_CONTEXT && !inquirerId) {
      return globalPipes;
    }
    const scopedPipeWrappers =
      this.config.getGlobalRequestPipes() as InstanceWrapper[];
    const scopedPipes = iterate(scopedPipeWrappers)
      .map(wrapper =>
        wrapper.getInstanceByContextId(
          this.getContextId(contextId, wrapper),
          inquirerId,
        ),
      )
      .filter(host => !!host)
      .map(host => {
        // A scoped instance only exists here, once per context
        if (host.isConstructorCalled) {
          assertEnhancer(host.instance, 'pipe');
        }
        return host.instance;
      })
      .toArray();

    return globalPipes.concat(scopedPipes) as T;
  }

  public setModuleContext(context: string) {
    this.moduleContext = context;
  }
}
