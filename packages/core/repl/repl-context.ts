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
  public readonly logger = new Logger(ReplContext.name);
  public debugRegistry: Record<ModuleKey, ModuleDebugEntry> = {};
  public readonly nativeFunctions = new Map<
    string,
    InstanceType<ReplFunctionClass>
  >();
  private readonly container: NestContainer;

  constructor(
    public readonly app: INestApplication,
    nativeFunctionsClassRefs?: ReplFunctionClass[],
  ) {
    this.container = (app as any).container; // Using `any` because `app.container` is not public.
    this.initializeContext();
    this.initializeNativeFunctions(nativeFunctionsClassRefs || []);
  }

  public writeToStdout(text: string) {
    process.stdout.write(text);
  }

  public addNativeFunction(NativeFunction: ReplFunctionClass): void {
    const nativeFunction = new NativeFunction(this);

    this.nativeFunctions.set(nativeFunction.fnDefinition.name, nativeFunction);

    nativeFunction.fnDefinition.aliases?.forEach(aliaseName => {
      const aliasNativeFunction: InstanceType<ReplFunctionClass> =
        Object.create(nativeFunction);
      aliasNativeFunction.fnDefinition = {
        name: aliaseName,
        description: aliasNativeFunction.fnDefinition.description,
        signature: aliasNativeFunction.fnDefinition.signature,
      };
      this.nativeFunctions.set(aliaseName, aliasNativeFunction);
    });
  }

  private initializeContext() {
    const modules = this.container.getModules();

    modules.forEach(moduleRef => {
      let moduleName = moduleRef.metatype.name;
      if (moduleName === InternalCoreModule.name) {
        return;
      }
      if (globalThis[moduleName]) {
        moduleName += ` (${moduleRef.token})`;
      }

      this.introspectCollection(moduleRef, moduleName, 'providers');
      this.introspectCollection(moduleRef, moduleName, 'controllers');

      // For in REPL auto-complete functionality
      Object.defineProperty(globalThis, moduleName, {
        value: moduleRef.metatype,
        configurable: false,
      });
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
        stringifiedToken === moduleRef.metatype.name ||
        globalThis[stringifiedToken]
      ) {
        return;
      }
      // For in REPL auto-complete functionality
      Object.defineProperty(globalThis, stringifiedToken, {
        value: token,
        configurable: false,
      });

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

    builtInFunctionsClassRefs
      .concat(nativeFunctionsClassRefs)
      .forEach(NativeFunction => {
        this.addNativeFunction(NativeFunction);
      });
  }
}
