import { Inject, Injectable, Logger, OnModuleInit, Type } from '@nestjs/common';
import { PARAMTYPES_METADATA } from '@nestjs/common/constants';
import {
  ApplicationConfig,
  ModuleRef,
  DiscoveryService,
  MetadataScanner,
  ModulesContainer,
  Reflector,
} from '@nestjs/core';
import { ExternalExceptionFilterContext } from '@nestjs/core/exceptions/external-exception-filter-context';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { ContextIdFactory } from '@nestjs/core/helpers/context-id-factory';
import { STATIC_CONTEXT } from '@nestjs/core/injector/constants';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { initTRPC, AnyRouter } from '@trpc/server';
import {
  TRPC_INPUT_METADATA,
  TRPC_MODULE_OPTIONS,
  TRPC_OUTPUT_METADATA,
  TRPC_PROCEDURE_METADATA,
  TRPC_PROCEDURE_TYPE_METADATA,
  TRPC_ROUTER_METADATA,
} from './constants';
import { TrpcContextCreator } from './context/trpc-context-creator';
import { ProcedureType } from './enums';
import { generateSchema, RouterInfo } from './generators/schema-generator';
import { TrpcModuleOptions, TrpcRouterMetadata } from './interfaces';
import { trpcRequestStorage } from './trpc-request-storage';

@Injectable()
export class TrpcRouter<
  TRouter extends AnyRouter = AnyRouter,
> implements OnModuleInit {
  private readonly logger = new Logger(TrpcRouter.name);
  private appRouter!: TRouter;
  private readonly contextCreator: TrpcContextCreator;
  private collectedRouterInfos: RouterInfo[] = [];

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly modulesContainer: ModulesContainer,
    private readonly reflector: Reflector,
    private readonly applicationConfig: ApplicationConfig,
    private readonly moduleRef: ModuleRef,
    @Inject(TRPC_MODULE_OPTIONS)
    private readonly options: TrpcModuleOptions,
  ) {
    const containerRef = {
      getModules: () => this.modulesContainer,
    } as any;
    this.contextCreator = new TrpcContextCreator(
      new GuardsContextCreator(containerRef, this.applicationConfig),
      new GuardsConsumer(),
      new InterceptorsContextCreator(containerRef, this.applicationConfig),
      new InterceptorsConsumer(),
      new PipesContextCreator(containerRef, this.applicationConfig),
      new PipesConsumer(),
      new ExternalExceptionFilterContext(containerRef, this.applicationConfig),
    );
  }

  onModuleInit() {
    this.appRouter = this.buildRouter() as TRouter;

    if (this.options.autoSchemaFile) {
      generateSchema(this.collectedRouterInfos, this.options.autoSchemaFile);
      this.logger.log(
        `Generated AppRouter types at "${this.options.autoSchemaFile}"`,
      );
    }
  }

  getRouter(): TRouter {
    return this.appRouter;
  }

  private resolveModuleKey(metatype: Type | Function): string {
    for (const [key, module] of this.modulesContainer) {
      if (module.hasProvider(metatype as Type)) {
        return key;
      }
    }
    return '';
  }

  private buildRouter(): AnyRouter {
    const t = initTRPC.context<any>().create();
    const routerMap: Record<string, any> = {};
    this.collectedRouterInfos = [];

    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const { instance, metatype } = wrapper;
      if (!metatype) {
        continue;
      }

      const routerMeta: TrpcRouterMetadata | undefined = this.reflector.get(
        TRPC_ROUTER_METADATA,
        metatype,
      );

      if (!routerMeta) {
        continue;
      }

      const alias = routerMeta.alias;
      const moduleKey = this.resolveModuleKey(metatype);
      const procedureMap: Record<string, any> = {};
      const routerInfo: RouterInfo = { alias, procedures: [] };
      const prototype =
        instance && typeof instance === 'object'
          ? Object.getPrototypeOf(instance)
          : (metatype as Type).prototype;
      if (!prototype) {
        continue;
      }

      const methodNames = this.metadataScanner.getAllMethodNames(prototype);

      for (const methodName of methodNames) {
        const methodRef = prototype[methodName];
        if (typeof methodRef !== 'function') {
          continue;
        }

        const procedureName: string | undefined = Reflect.getMetadata(
          TRPC_PROCEDURE_METADATA,
          methodRef,
        );
        const procedureType: ProcedureType | undefined = Reflect.getMetadata(
          TRPC_PROCEDURE_TYPE_METADATA,
          methodRef,
        );

        if (!procedureName || !procedureType) {
          continue;
        }

        const inputSchema = Reflect.getMetadata(TRPC_INPUT_METADATA, methodRef);
        const outputSchema = Reflect.getMetadata(
          TRPC_OUTPUT_METADATA,
          methodRef,
        );

        let procedure = t.procedure;

        if (inputSchema) {
          procedure = procedure.input(inputSchema) as any;
        }
        if (outputSchema && procedureType !== ProcedureType.SUBSCRIPTION) {
          procedure = procedure.output(outputSchema) as any;
        }

        const paramTypes: unknown[] =
          Reflect.getMetadata(PARAMTYPES_METADATA, prototype, methodName) ?? [];

        // Create a context-aware handler that runs guards → interceptors → pipes → handler,
        // including request-scoped providers and filters.
        const wrappedHandler = this.contextCreator.create({
          callback: methodRef,
          methodName,
          moduleKey,
          paramTypes,
          inquirerId: wrapper.id,
          resolveContextId: () => this.resolveContextId(wrapper),
          resolveInstance: (contextId: { id: number }) =>
            this.resolveRouterInstance(wrapper, metatype, contextId),
        });

        switch (procedureType) {
          case ProcedureType.QUERY:
            procedureMap[procedureName] = procedure.query(
              async ({ input, ctx }: { input: unknown; ctx: unknown }) => {
                return wrappedHandler(input, ctx);
              },
            );
            break;
          case ProcedureType.MUTATION:
            procedureMap[procedureName] = procedure.mutation(
              async ({ input, ctx }: { input: unknown; ctx: unknown }) => {
                return wrappedHandler(input, ctx);
              },
            );
            break;
          case ProcedureType.SUBSCRIPTION: {
            const validateOutput = (value: unknown) =>
              this.validateSubscriptionOutput(outputSchema, value);
            procedureMap[procedureName] = procedure.subscription(
              async function* ({
                input,
                ctx,
              }: {
                input: unknown;
                ctx: unknown;
              }) {
                const result = await wrappedHandler(input, ctx);
                if (
                  result != null &&
                  typeof result === 'object' &&
                  Symbol.asyncIterator in (result as any)
                ) {
                  for await (const chunk of result as AsyncIterable<unknown>) {
                    yield await validateOutput(chunk);
                  }
                } else {
                  yield await validateOutput(result);
                }
              },
            );
            break;
          }
        }

        this.logger.log(
          `Mapped {${procedureType}} "${alias ? alias + '.' : ''}${procedureName}" procedure`,
        );

        routerInfo.procedures.push({
          name: procedureName,
          type: procedureType,
          inputSchema,
          outputSchema,
        });
      }

      if (Object.keys(procedureMap).length > 0) {
        if (alias) {
          routerMap[alias] = t.router(procedureMap);
        } else {
          Object.assign(routerMap, procedureMap);
        }
        this.collectedRouterInfos.push(routerInfo);
      }
    }

    return t.router(routerMap);
  }

  private resolveContextId(wrapper: any): { id: number } {
    const store = trpcRequestStorage.getStore();
    if (!store?.req) {
      return STATIC_CONTEXT;
    }

    if (!store.contextId) {
      store.contextId = ContextIdFactory.getByRequest(store.req);
    }

    if (!store.requestRegistered) {
      const requestProviderValue =
        wrapper?.isDependencyTreeDurable?.() && store.contextId.payload
          ? store.contextId.payload
          : Object.assign(store.req, store.contextId.payload ?? {});
      this.moduleRef.registerRequestByContextId(
        requestProviderValue,
        store.contextId,
      );
      store.requestRegistered = true;
    }

    return store.contextId;
  }

  private async resolveRouterInstance(
    wrapper: any,
    metatype: Type | Function,
    contextId: { id: number },
  ): Promise<any> {
    if (contextId === STATIC_CONTEXT && wrapper?.instance) {
      return wrapper.instance;
    }

    try {
      return await this.moduleRef.resolve(
        metatype as Type<unknown>,
        contextId,
        {
          strict: false,
        },
      );
    } catch {
      return wrapper?.instance;
    }
  }

  private async validateSubscriptionOutput(
    outputSchema: any,
    value: unknown,
  ): Promise<unknown> {
    if (!outputSchema) {
      return value;
    }

    if (typeof outputSchema.parseAsync === 'function') {
      return outputSchema.parseAsync(value);
    }
    if (typeof outputSchema.parse === 'function') {
      return outputSchema.parse(value);
    }
    if (typeof outputSchema.validateSync === 'function') {
      return outputSchema.validateSync(value);
    }
    if (typeof outputSchema.create === 'function') {
      return outputSchema.create(value);
    }
    if (typeof outputSchema.assert === 'function') {
      outputSchema.assert(value);
      return value;
    }
    if (typeof outputSchema === 'function') {
      return outputSchema(value);
    }

    return value;
  }
}
