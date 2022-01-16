import { FILTER_CATCH_EXCEPTIONS } from '@nestjs/common/constants';
import { Type } from '@nestjs/common/interfaces';
import { ExceptionFilter } from '@nestjs/common/interfaces/exceptions/exception-filter.interface';
import { isEmpty, isFunction } from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import { ContextCreator } from '../helpers/context-creator';
import { STATIC_CONTEXT } from '../injector/constants';
import { NestContainer } from '../injector/container';
import { InstanceWrapper } from '../injector/instance-wrapper';

export class BaseExceptionFilterContext extends ContextCreator {
  protected moduleContext: string;

  constructor(private readonly container: NestContainer) {
    super();
  }

  public createConcreteContext<T extends any[], R extends any[]>(
    metadata: T,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): R {
    if (isEmpty(metadata)) {
      return [] as R;
    }
    return iterate(metadata)
      .filter(
        instance => instance && (isFunction(instance.catch) || instance.name),
      )
      .map(filter => this.getFilterInstance(filter, contextId, inquirerId))
      .filter(item => !!item)
      .map(instance => ({
        func: instance.catch.bind(instance),
        exceptionMetatypes: this.reflectCatchExceptions(instance),
      }))
      .toArray() as R;
  }

  public getFilterInstance(
    filter: Function | ExceptionFilter,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): ExceptionFilter | null {
    const isObject = (filter as ExceptionFilter).catch;
    if (isObject) {
      return filter as ExceptionFilter;
    }
    const instanceWrapper = this.getInstanceByMetatype(filter as Type<unknown>);
    if (!instanceWrapper) {
      return null;
    }
    const instanceHost = instanceWrapper.getInstanceByContextId(
      contextId,
      inquirerId,
    );
    return instanceHost && instanceHost.instance;
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

  public reflectCatchExceptions(instance: ExceptionFilter): Type<any>[] {
    const prototype = Object.getPrototypeOf(instance);
    return (
      Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, prototype.constructor) || []
    );
  }
}
