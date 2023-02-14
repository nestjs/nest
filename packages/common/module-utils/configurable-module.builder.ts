import { DynamicModule, Provider } from '../interfaces';
import { Logger } from '../services/logger.service';
import { randomStringGenerator } from '../utils/random-string-generator.util';
import {
  ASYNC_METHOD_SUFFIX,
  CONFIGURABLE_MODULE_ID,
  DEFAULT_FACTORY_CLASS_METHOD_KEY,
  DEFAULT_METHOD_KEY,
} from './constants';
import {
  ConfigurableModuleAsyncOptions,
  ConfigurableModuleCls,
  ConfigurableModuleHost,
  ConfigurableModuleOptionsFactory,
} from './interfaces';
import { generateOptionsInjectionToken, getInjectionProviders } from './utils';

/**
 * @publicApi
 */
export interface ConfigurableModuleBuilderOptions {
  /**
   * Specified what injection token should be used for the module options provider.
   * By default, an auto-generated UUID will be used.
   */
  optionsInjectionToken?: string | symbol;
  /**
   * By default, an UUID will be used as a module options provider token.
   * Explicitly specifying the "moduleName" will instruct the "ConfigurableModuleBuilder"
   * to use a more descriptive provider token.
   *
   * For example, if `moduleName: "Cache"` then auto-generated provider token will be "CACHE_MODULE_OPTIONS".
   */
  moduleName?: string;
  /**
   * Indicates whether module should always be "transient", meaning,
   * every time you call the static method to construct a dynamic module,
   * regardless of what arguments you pass in, a new "unique" module will be created.
   *
   * @default false
   */
  alwaysTransient?: boolean;
}

/**
 * Factory that lets you create configurable modules and
 * provides a way to reduce the majority of dynamic module boilerplate.
 *
 * @publicApi
 */
export class ConfigurableModuleBuilder<
  ModuleOptions,
  StaticMethodKey extends string = typeof DEFAULT_METHOD_KEY,
  FactoryClassMethodKey extends string = typeof DEFAULT_FACTORY_CLASS_METHOD_KEY,
  ExtraModuleDefinitionOptions = {},
> {
  protected staticMethodKey: StaticMethodKey;
  protected factoryClassMethodKey: FactoryClassMethodKey;
  protected extras: ExtraModuleDefinitionOptions;
  protected transformModuleDefinition: (
    definition: DynamicModule,
    extraOptions: ExtraModuleDefinitionOptions,
  ) => DynamicModule;

  protected readonly logger = new Logger(ConfigurableModuleBuilder.name);

  constructor(
    protected readonly options: ConfigurableModuleBuilderOptions = {},
    parentBuilder?: ConfigurableModuleBuilder<ModuleOptions>,
  ) {
    if (parentBuilder) {
      this.staticMethodKey = parentBuilder.staticMethodKey as StaticMethodKey;
      this.factoryClassMethodKey =
        parentBuilder.factoryClassMethodKey as FactoryClassMethodKey;
      this.transformModuleDefinition = parentBuilder.transformModuleDefinition;
      this.extras = parentBuilder.extras as ExtraModuleDefinitionOptions;
    }
  }

  /**
   * Registers the "extras" object (a set of extra options that can be used to modify the dynamic module definition).
   * Values you specify within the "extras" object will be used as default values (that can be overridden by module consumers).
   *
   * This method also applies the so-called "module definition transform function" that takes the auto-generated
   * dynamic module object ("DynamicModule") and the actual consumer "extras" object as input parameters.
   * The "extras" object consists of values explicitly specified by module consumers and default values.
   *
   * @example
   * ```typescript
   * .setExtras<{ isGlobal?: boolean }>({ isGlobal: false }, (definition, extras) =>
   *    ({ ...definition, global: extras.isGlobal })
   * )
   * ```
   */
  setExtras<ExtraModuleDefinitionOptions>(
    extras: ExtraModuleDefinitionOptions,
    transformDefinition: (
      definition: DynamicModule,
      extras: ExtraModuleDefinitionOptions,
    ) => DynamicModule = def => def,
  ) {
    const builder = new ConfigurableModuleBuilder<
      ModuleOptions,
      StaticMethodKey,
      FactoryClassMethodKey,
      ExtraModuleDefinitionOptions
    >(this.options, this as any);
    builder.extras = extras;
    builder.transformModuleDefinition = transformDefinition;
    return builder;
  }

  /**
   * Dynamic modules must expose public static methods that let you pass in
   * configuration parameters (control the module's behavior from the outside).
   * Some frequently used names that you may have seen in other modules are:
   * "forRoot", "forFeature", "register", "configure".
   *
   * This method "setClassMethodName" lets you specify the name of the
   * method that will be auto-generated.
   *
   * @param key name of the method
   */
  setClassMethodName<StaticMethodKey extends string>(key: StaticMethodKey) {
    const builder = new ConfigurableModuleBuilder<
      ModuleOptions,
      StaticMethodKey,
      FactoryClassMethodKey,
      ExtraModuleDefinitionOptions
    >(this.options, this as any);
    builder.staticMethodKey = key;
    return builder;
  }

  /**
   * Asynchronously configured modules (that rely on other modules, i.e. "ConfigModule")
   * let you pass the configuration factory class that will be registered and instantiated as a provider.
   * This provider then will be used to retrieve the module's configuration. To provide the configuration,
   * the corresponding factory method must be implemented.
   *
   * This method ("setFactoryMethodName") lets you control what method name will have to be
   * implemented by the config factory (default is "create").
   *
   * @param key name of the method
   */
  setFactoryMethodName<FactoryClassMethodKey extends string>(
    key: FactoryClassMethodKey,
  ) {
    const builder = new ConfigurableModuleBuilder<
      ModuleOptions,
      StaticMethodKey,
      FactoryClassMethodKey,
      ExtraModuleDefinitionOptions
    >(this.options, this as any);
    builder.factoryClassMethodKey = key;
    return builder;
  }

  /**
   * Returns an object consisting of multiple properties that lets you
   * easily construct dynamic configurable modules. See "ConfigurableModuleHost" interface for more details.
   */
  build(): ConfigurableModuleHost<
    ModuleOptions,
    StaticMethodKey,
    FactoryClassMethodKey,
    ExtraModuleDefinitionOptions
  > {
    this.staticMethodKey ??= DEFAULT_METHOD_KEY as StaticMethodKey;
    this.factoryClassMethodKey ??=
      DEFAULT_FACTORY_CLASS_METHOD_KEY as FactoryClassMethodKey;
    this.options.optionsInjectionToken ??= this.options.moduleName
      ? this.constructInjectionTokenString()
      : generateOptionsInjectionToken();
    this.transformModuleDefinition ??= definition => definition;

    return {
      ConfigurableModuleClass:
        this.createConfigurableModuleCls<ModuleOptions>(),
      MODULE_OPTIONS_TOKEN: this.options.optionsInjectionToken,
      ASYNC_OPTIONS_TYPE: this.createTypeProxy('ASYNC_OPTIONS_TYPE'),
      OPTIONS_TYPE: this.createTypeProxy('OPTIONS_TYPE'),
    };
  }

  private constructInjectionTokenString(): string {
    const moduleNameInSnakeCase = this.options.moduleName
      .trim()
      .split(/(?=[A-Z])/)
      .join('_')
      .toUpperCase();
    return `${moduleNameInSnakeCase}_MODULE_OPTIONS`;
  }

  private createConfigurableModuleCls<ModuleOptions>(): ConfigurableModuleCls<
    ModuleOptions,
    StaticMethodKey,
    FactoryClassMethodKey
  > {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const asyncMethodKey = this.staticMethodKey + ASYNC_METHOD_SUFFIX;

    class InternalModuleClass {
      static [self.staticMethodKey](
        options: ModuleOptions & ExtraModuleDefinitionOptions,
      ): DynamicModule {
        const providers: Array<Provider> = [
          {
            provide: self.options.optionsInjectionToken,
            useValue: this.omitExtras(options, self.extras),
          },
        ];
        if (self.options.alwaysTransient) {
          providers.push({
            provide: CONFIGURABLE_MODULE_ID,
            useValue: randomStringGenerator(),
          });
        }
        return self.transformModuleDefinition(
          {
            module: this,
            providers,
          },
          {
            ...self.extras,
            ...options,
          },
        );
      }

      static [asyncMethodKey](
        options: ConfigurableModuleAsyncOptions<ModuleOptions> &
          ExtraModuleDefinitionOptions,
      ): DynamicModule {
        const providers = this.createAsyncProviders(options);
        if (self.options.alwaysTransient) {
          providers.push({
            provide: CONFIGURABLE_MODULE_ID,
            useValue: randomStringGenerator(),
          });
        }
        return self.transformModuleDefinition(
          {
            module: this,
            imports: options.imports || [],
            providers,
          },
          {
            ...self.extras,
            ...options,
          },
        );
      }

      private static omitExtras(
        input: ModuleOptions & ExtraModuleDefinitionOptions,
        extras: ExtraModuleDefinitionOptions | undefined,
      ): ModuleOptions {
        if (!extras) {
          return input;
        }
        const moduleOptions = {};
        const extrasKeys = Object.keys(extras);

        Object.keys(input)
          .filter(key => !extrasKeys.includes(key))
          .forEach(key => {
            moduleOptions[key] = input[key];
          });
        return moduleOptions as ModuleOptions;
      }

      private static createAsyncProviders(
        options: ConfigurableModuleAsyncOptions<ModuleOptions>,
      ): Provider[] {
        if (options.useExisting || options.useFactory) {
          if (options.inject && options.provideInjectionTokensFrom) {
            return [
              this.createAsyncOptionsProvider(options),
              ...getInjectionProviders(
                options.provideInjectionTokensFrom,
                options.inject,
              ),
            ];
          }
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
        options: ConfigurableModuleAsyncOptions<ModuleOptions>,
      ): Provider {
        if (options.useFactory) {
          return {
            provide: self.options.optionsInjectionToken,
            useFactory: options.useFactory,
            inject: options.inject || [],
          };
        }
        return {
          provide: self.options.optionsInjectionToken,
          useFactory: async (
            optionsFactory: ConfigurableModuleOptionsFactory<
              ModuleOptions,
              FactoryClassMethodKey
            >,
          ) =>
            await optionsFactory[
              self.factoryClassMethodKey as keyof typeof optionsFactory
            ](),
          inject: [options.useExisting || options.useClass],
        };
      }
    }
    return InternalModuleClass as unknown as ConfigurableModuleCls<
      ModuleOptions,
      StaticMethodKey,
      FactoryClassMethodKey
    >;
  }

  private createTypeProxy(
    typeName: 'OPTIONS_TYPE' | 'ASYNC_OPTIONS_TYPE' | 'OptionsFactoryInterface',
  ) {
    const proxy = new Proxy(
      {},
      {
        get: () => {
          throw new Error(
            `"${typeName}" is not supposed to be used as a value.`,
          );
        },
      },
    );
    return proxy as any;
  }
}
