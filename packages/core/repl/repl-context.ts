import { INestApplication, InjectionToken, Logger } from '@nestjs/common';
import { ApplicationConfig } from '../application-config';
import { ModuleRef, NestContainer } from '../injector';
import { InternalCoreModule } from '../injector/internal-core-module';
import { Module } from '../injector/module';
import {
  DebugReplFn,
  GetReplFn,
  HelpReplFn,
  MethodsReplFn,
  ResolveReplFn,
  SelectReplFn,
} from './native-functions';
import type { ReplFunctionClass } from './repl.interfaces';

type ModuleKey = string;
export type ModuleDebugEntry = {
  controllers: Record<string, InjectionToken>;
  providers: Record<string, InjectionToken>;
};

export class ReplContext {
  public nativeFunctions: InstanceType<ReplFunctionClass>[];

  public debugRegistry: Record<ModuleKey, ModuleDebugEntry> = {};
  public readonly container: NestContainer;
  public readonly logger = new Logger(ReplContext.name);

  constructor(
    public readonly app: INestApplication,
    nativeFunctionsClassRefs?: ReplFunctionClass[],
  ) {
    this.container = (app as any).container;
    this.initializeContext();
    this.initializeNativeFunctions(nativeFunctionsClassRefs || []);
  }

  private initializeContext() {
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
    const moduleDebugEntry = {};
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

  private initializeNativeFunctions(
    nativeFunctionsClassRefs: ReplFunctionClass[],
  ): void {
    const builtInFunctionsClassRefs: ReplFunctionClass[] = [
      HelpReplFn,
      GetReplFn,
      ResolveReplFn,
      SelectReplFn,
      DebugReplFn,
      MethodsReplFn,
    ];

    this.nativeFunctions = builtInFunctionsClassRefs
      .concat(nativeFunctionsClassRefs)
      .map(NativeFn => new NativeFn(this));
  }

  public writeToStdout(text: string) {
    process.stdout.write(text);
  }
}
