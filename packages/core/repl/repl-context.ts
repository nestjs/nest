import {
  INestApplicationContext,
  InjectionToken,
  Logger,
} from '@nestjs/common';
import { ApplicationConfig } from '../application-config';
import { ModuleRef, NestContainer } from '../injector';
import { InternalCoreModule } from '../injector/internal-core-module/internal-core-module';
import { Module } from '../injector/module';
import {
  DebugReplFn,
  GetReplFn,
  HelpReplFn,
  MethodsReplFn,
  ResolveReplFn,
  SelectReplFn,
} from './native-functions';
import { ReplFunction } from './repl-function';
import type { ReplFunctionClass } from './repl.interfaces';

type ModuleKey = string;
export type ModuleDebugEntry = {
  controllers: Record<string, InjectionToken>;
  providers: Record<string, InjectionToken>;
};

type ReplScope = Record<string, any>;

export class ReplContext {
  public readonly logger = new Logger(ReplContext.name);
  public debugRegistry: Record<ModuleKey, ModuleDebugEntry> = {};
  public readonly globalScope: ReplScope = Object.create(null);
  public readonly nativeFunctions = new Map<
    string,
    InstanceType<ReplFunctionClass>
  >();
  private readonly container: NestContainer;

  constructor(
    public readonly app: INestApplicationContext,
    nativeFunctionsClassRefs?: ReplFunctionClass[],
  ) {
    this.container = (app as any).container; // Using `any` because `app.container` is not public.

    this.initializeContext();
    this.initializeNativeFunctions(nativeFunctionsClassRefs || []);
  }

  public writeToStdout(text: string) {
    process.stdout.write(text);
  }

  private initializeContext() {
    const modules = this.container.getModules();

    modules.forEach(moduleRef => {
      let moduleName = moduleRef.metatype.name;
      if (moduleName === InternalCoreModule.name) {
        return;
      }
      if (this.globalScope[moduleName]) {
        moduleName += ` (${moduleRef.token})`;
      }

      this.introspectCollection(moduleRef, moduleName, 'providers');
      this.introspectCollection(moduleRef, moduleName, 'controllers');

      // For in REPL auto-complete functionality
      Object.defineProperty(this.globalScope, moduleName, {
        value: moduleRef.metatype,
        configurable: false,
        enumerable: true,
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
        stringifiedToken === moduleRef.metatype.name
      ) {
        return;
      }

      if (!this.globalScope[stringifiedToken]) {
        // For in REPL auto-complete functionality
        Object.defineProperty(this.globalScope, stringifiedToken, {
          value: token,
          configurable: false,
          enumerable: true,
        });
      }

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
      : `"${token}"`;
  }

  private addNativeFunction(
    NativeFunctionRef: ReplFunctionClass,
  ): InstanceType<ReplFunctionClass>[] {
    const nativeFunction = new NativeFunctionRef(this);
    const nativeFunctions = [nativeFunction];

    this.nativeFunctions.set(nativeFunction.fnDefinition.name, nativeFunction);

    nativeFunction.fnDefinition.aliases?.forEach(aliasName => {
      const aliasNativeFunction: InstanceType<ReplFunctionClass> =
        Object.create(nativeFunction);
      aliasNativeFunction.fnDefinition = {
        name: aliasName,
        description: aliasNativeFunction.fnDefinition.description,
        signature: aliasNativeFunction.fnDefinition.signature,
      };
      this.nativeFunctions.set(aliasName, aliasNativeFunction);
      nativeFunctions.push(aliasNativeFunction);
    });

    return nativeFunctions;
  }

  private registerFunctionIntoGlobalScope(
    nativeFunction: InstanceType<ReplFunctionClass>,
  ) {
    // Bind the method to REPL's context:
    this.globalScope[nativeFunction.fnDefinition.name] =
      nativeFunction.action.bind(nativeFunction);

    // Load the help trigger as a `help` getter on each native function:
    const functionBoundRef: ReplFunction['action'] =
      this.globalScope[nativeFunction.fnDefinition.name];
    Object.defineProperty(functionBoundRef, 'help', {
      enumerable: false,
      configurable: false,
      get: () =>
        // Dynamically builds the help message as will unlikely to be called
        // several times.
        this.writeToStdout(nativeFunction.makeHelpMessage()),
    });
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
        const nativeFunctions = this.addNativeFunction(NativeFunction);
        nativeFunctions.forEach(nativeFunction => {
          this.registerFunctionIntoGlobalScope(nativeFunction);
        });
      });
  }
}
