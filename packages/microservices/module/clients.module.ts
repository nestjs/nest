import {
  DynamicModule,
  Module,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';
import { ClientProxy, ClientProxyFactory } from '../client';
import { Closeable } from '../interfaces';
import {
  ClientsModuleAsyncOptions,
  ClientsModuleOptions,
  ClientsModuleOptionsFactory,
  ClientsProviderAsyncOptions,
} from './interfaces';

@Module({})
export class ClientsModule {
  static register(options: ClientsModuleOptions): DynamicModule {
    const clients = (options || []).map(item => ({
      provide: item.name,
      useValue: this.assignOnAppShutdownHook(ClientProxyFactory.create(item)),
    }));
    return {
      module: ClientsModule,
      providers: clients,
      exports: clients,
    };
  }

  static registerAsync(options: ClientsModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = options.reduce(
      (accProviders: Provider[], item) =>
        accProviders
          .concat(this.createAsyncProviders(item))
          .concat(item.extraProviders || []),
      [],
    );
    const imports = options.reduce(
      (accImports, option) =>
        option.imports && !accImports.includes(option.imports)
          ? accImports.concat(option.imports)
          : accImports,
      [],
    );
    return {
      module: ClientsModule,
      imports,
      providers: providers,
      exports: providers,
    };
  }

  private static createAsyncProviders(
    options: ClientsProviderAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: ClientsProviderAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: options.name,
        useFactory: this.createFactoryWrapper(options.useFactory),
        inject: options.inject || [],
      };
    }
    return {
      provide: options.name,
      useFactory: this.createFactoryWrapper(
        (optionsFactory: ClientsModuleOptionsFactory) =>
          optionsFactory.createClientOptions(),
      ),
      inject: [options.useExisting || options.useClass],
    };
  }

  private static createFactoryWrapper(
    useFactory: ClientsProviderAsyncOptions['useFactory'],
  ) {
    return async (...args: any[]) => {
      const clientOptions = await useFactory(...args);
      const clientProxyRef = ClientProxyFactory.create(clientOptions);
      return this.assignOnAppShutdownHook(clientProxyRef);
    };
  }

  private static assignOnAppShutdownHook(client: ClientProxy & Closeable) {
    ((client as unknown) as OnApplicationShutdown).onApplicationShutdown =
      client.close;
    return client;
  }
}
