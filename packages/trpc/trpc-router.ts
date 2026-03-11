import { Inject, Injectable, Logger, OnModuleInit, Type } from '@nestjs/common';
import {
  DiscoveryService,
  MetadataScanner,
  ModulesContainer,
  Reflector,
} from '@nestjs/core';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
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
    @Inject(TRPC_MODULE_OPTIONS)
    private readonly options: TrpcModuleOptions,
    guardsContextCreator: GuardsContextCreator,
    guardsConsumer: GuardsConsumer,
    interceptorsContextCreator: InterceptorsContextCreator,
    interceptorsConsumer: InterceptorsConsumer,
    pipesContextCreator: PipesContextCreator,
    pipesConsumer: PipesConsumer,
  ) {
    this.contextCreator = new TrpcContextCreator(
      guardsContextCreator,
      guardsConsumer,
      interceptorsContextCreator,
      interceptorsConsumer,
      pipesContextCreator,
      pipesConsumer,
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
      if (!instance || !metatype) {
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

      const methodNames = this.metadataScanner.getAllMethodNames(
        Object.getPrototypeOf(instance),
      );

      for (const methodName of methodNames) {
        const methodRef = instance[methodName];
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
        if (outputSchema) {
          procedure = procedure.output(outputSchema) as any;
        }

        // Create a context-aware handler that runs guards → interceptors → pipes → handler
        const wrappedHandler = this.contextCreator.create(
          instance,
          methodRef,
          moduleKey,
        );

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
          case ProcedureType.SUBSCRIPTION:
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
                  yield* result as AsyncIterable<unknown>;
                } else {
                  yield result;
                }
              },
            );
            break;
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
}
