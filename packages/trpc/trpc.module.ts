import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TRPC_MODULE_OPTIONS } from './constants';
import { TrpcModuleAsyncOptions, TrpcModuleOptions } from './interfaces';
import { TrpcHttpAdapter } from './trpc-http-adapter';
import { TrpcRouter } from './trpc-router';

/**
 * NestJS module providing native tRPC integration.
 *
 * Use `TrpcModule.forRoot()` to register the tRPC handler with static options,
 * or `TrpcModule.forRootAsync()` for dynamic/factory-based configuration.
 *
 * @example
 * ```ts
 * @Module({
 *   imports: [
 *     TrpcModule.forRoot({ path: '/trpc' }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @publicApi
 */
@Module({})
export class TrpcModule {
  static forRoot(options: TrpcModuleOptions = {}): DynamicModule {
    const optionsProvider: Provider = {
      provide: TRPC_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: TrpcModule,
      global: options.isGlobal ?? false,
      imports: [DiscoveryModule],
      providers: [optionsProvider, TrpcRouter, TrpcHttpAdapter],
      exports: [TrpcRouter],
    };
  }

  static forRootAsync(options: TrpcModuleAsyncOptions): DynamicModule {
    const asyncOptionsProvider: Provider = {
      provide: TRPC_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };

    return {
      module: TrpcModule,
      global: options.isGlobal ?? false,
      imports: [DiscoveryModule, ...(options.imports ?? [])],
      providers: [
        asyncOptionsProvider,
        ...(options.extraProviders ?? []),
        TrpcRouter,
        TrpcHttpAdapter,
      ],
      exports: [TrpcRouter],
    };
  }
}
