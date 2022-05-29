import {
  DynamicModule,
  INestApplication,
  InjectionToken,
  Logger,
  Type,
} from '@nestjs/common';
import { clc } from '@nestjs/common/utils/cli-colors.util';
import { ApplicationConfig } from '../application-config';
import { ModuleRef, NestContainer } from '../injector';
import { InternalCoreModule } from '../injector/internal-core-module';
import { Module } from '../injector/module';
import { MetadataScanner } from '../metadata-scanner';

type ModuleKey = string;
type ModuleDebugEntry = {
  controllers: Record<string, InjectionToken>;
  providers: Record<string, InjectionToken>;
};

export class ReplContext {
  private debugRegistry: Record<ModuleKey, ModuleDebugEntry> = {};
  private readonly container: NestContainer;
  private readonly logger = new Logger(ReplContext.name);
  private readonly metadataScanner = new MetadataScanner();

  constructor(private readonly app: INestApplication) {
    this.container = (app as any).container;
    this.initialize();
  }

  $(token: string | symbol | Function | Type<any>) {
    return this.get(token);
  }

  get(token: string | symbol | Function | Type<any>) {
    return this.app.get(token);
  }

  resolve(token: string | symbol | Function | Type<any>, contextId: any) {
    return this.app.resolve(token, contextId);
  }

  select(token: DynamicModule | Type<unknown>) {
    return this.app.select(token);
  }

  debug(moduleCls?: Type | string) {
    this.writeToStdout('\n');

    if (moduleCls) {
      const token =
        typeof moduleCls === 'function' ? moduleCls.name : moduleCls;
      const moduleEntry = this.debugRegistry[token];
      if (!moduleEntry) {
        return this.logger.error(
          `"${token}" has not been found in the modules registry`,
        );
      }
      this.printCtrlsAndProviders(token, moduleEntry);
    } else {
      Object.keys(this.debugRegistry).forEach(moduleKey => {
        this.printCtrlsAndProviders(moduleKey, this.debugRegistry[moduleKey]);
      });
    }
    this.writeToStdout('\n');
  }

  methods(token: Type | string) {
    const proto =
      typeof token !== 'function'
        ? Object.getPrototypeOf(this.app.get(token))
        : token?.prototype;

    const methods = new Set(
      this.metadataScanner.getAllFilteredMethodNames(proto),
    );

    this.writeToStdout('\n');
    this.writeToStdout(`${clc.green('Methods')}: \n`);
    methods.forEach(methodName =>
      this.writeToStdout(` ${clc.yellow('◻')} ${methodName}\n`),
    );
    this.writeToStdout('\n');
  }

  private initialize() {
    const globalRef = globalThis;
    const modules = this.container.getModules();

    modules.forEach(moduleRef => {
      let moduleName = moduleRef.metatype.name;
      if (moduleName === InternalCoreModule.name) {
        return;
      }
      if (globalRef[moduleName]) {
        moduleName += ` (${moduleRef.token})`;
      }

      this.introspectCollection(moduleRef, moduleName, 'providers');
      this.introspectCollection(moduleRef, moduleName, 'controllers');

      globalRef[moduleName] = moduleRef.metatype;
    });
  }

  private introspectCollection(
    moduleRef: Module,
    moduleKey: ModuleKey,
    collection: keyof ModuleDebugEntry,
  ) {
    let moduleDebugEntry = {};
    moduleRef[collection].forEach(({ token }) => {
      const stringifiedToken = this.stringifyToken(token);
      if (
        stringifiedToken === ApplicationConfig.name ||
        stringifiedToken === moduleRef.metatype.name
      ) {
        return;
      }
      // For in REPL auto-complete functionality
      globalThis[stringifiedToken] = token;

      if (stringifiedToken === ModuleRef.name) {
        return;
      }
      moduleDebugEntry[stringifiedToken] = token;
    });

    this.debugRegistry[moduleKey] = {
      ...this.debugRegistry?.[moduleKey],
      [collection]: moduleDebugEntry,
    };
  }

  private stringifyToken(token: unknown): string {
    return typeof token !== 'string'
      ? typeof token === 'function'
        ? token.name
        : token?.toString()
      : token;
  }

  private printCtrlsAndProviders(
    moduleName: string,
    moduleDebugEntry: ModuleDebugEntry,
  ) {
    const printCollection = (collection: keyof ModuleDebugEntry) => {
      const collectionEntries = Object.keys(moduleDebugEntry[collection]);
      if (collectionEntries.length <= 0) {
        return;
      }
      this.writeToStdout(` ${clc.yellow(`- ${collection}`)}: \n`);
      collectionEntries.forEach(provider =>
        this.writeToStdout(`  ${clc.green('◻')} ${provider}\n`),
      );
    };

    this.writeToStdout(`${clc.green(moduleName)}: \n`);
    printCollection('controllers');
    printCollection('providers');
  }

  private writeToStdout(text: string) {
    process.stdout.write(text);
  }
}
