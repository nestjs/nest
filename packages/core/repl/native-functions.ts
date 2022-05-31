import { DynamicModule, INestApplicationContext, Type } from '@nestjs/common';
import { clc } from '@nestjs/common/utils/cli-colors.util';
import { MetadataScanner } from '../metadata-scanner';
import { ReplFunction } from './repl-function';
import type { ModuleDebugEntry } from './repl-context';
import type { ReplFnDefinition } from './repl.interfaces';

export class GetReplFn extends ReplFunction {
  public fnDefinition: ReplFnDefinition = {
    name: 'get',
    signature: '(token: InjectionToken) => any',
    description:
      'Retrieves an instance of either injectable or controller, otherwise, throws exception.',
    aliases: ['$'],
  };

  action(token: string | symbol | Function | Type<any>): any {
    this.ctx.app.get(token);
  }
}

export class ResolveReplFn extends ReplFunction {
  public fnDefinition: ReplFnDefinition = {
    name: 'resolve',
    description:
      'Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception',
    signature: '(token: InjectionToken, contextId: any) => Promise<any>',
  };

  action(
    token: string | symbol | Function | Type<any>,
    contextId: any,
  ): Promise<any> {
    return this.ctx.app.resolve(token, contextId);
  }
}

export class SelectReplFn extends ReplFunction {
  public fnDefinition: ReplFnDefinition = {
    name: 'select',
    description:
      'Allows navigating through the modules tree, for example, to pull out a specific instance from the selected module.',
    signature: '(token: DynamicModule | ClassRef) => INestApplicationContext',
  };

  action(token: DynamicModule | Type<unknown>): INestApplicationContext {
    return this.ctx.app.select(token);
  }
}

export class DebugReplFn extends ReplFunction {
  public fnDefinition: ReplFnDefinition = {
    name: 'debug',
    description: '',
    signature: '(moduleCls?: ClassRef | string) => void',
  };

  action(moduleCls?: Type<unknown> | string): void {
    this.ctx.writeToStdout('\n');

    if (moduleCls) {
      const token =
        typeof moduleCls === 'function' ? moduleCls.name : moduleCls;
      const moduleEntry = this.ctx.debugRegistry[token];
      if (!moduleEntry) {
        return this.logger.error(
          `"${token}" has not been found in the modules registry`,
        );
      }
      this.printCtrlsAndProviders(token, moduleEntry);
    } else {
      Object.keys(this.ctx.debugRegistry).forEach(moduleKey => {
        this.printCtrlsAndProviders(
          moduleKey,
          this.ctx.debugRegistry[moduleKey],
        );
      });
    }
    this.ctx.writeToStdout('\n');
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
      this.ctx.writeToStdout(` ${clc.yellow(`- ${collection}`)}: \n`);
      collectionEntries.forEach(provider =>
        this.ctx.writeToStdout(`  ${clc.green('◻')} ${provider}\n`),
      );
    };

    this.ctx.writeToStdout(`${clc.green(moduleName)}: \n`);
    printCollection('controllers');
    printCollection('providers');
  }
}

export class MethodsReplFn extends ReplFunction {
  public fnDefinition: ReplFnDefinition = {
    name: 'methods',
    description: 'Display all public methods available on a given provider.',
    signature: '(token: ClassRef | string) => void',
  };

  private readonly metadataScanner = new MetadataScanner();

  action(token: Type<unknown> | string): void {
    const proto =
      typeof token !== 'function'
        ? Object.getPrototypeOf(this.ctx.app.get(token))
        : token?.prototype;

    const methods = new Set(
      this.metadataScanner.getAllFilteredMethodNames(proto),
    );

    this.ctx.writeToStdout('\n');
    this.ctx.writeToStdout(`${clc.green('Methods')}: \n`);
    methods.forEach(methodName =>
      this.ctx.writeToStdout(` ${clc.yellow('◻')} ${methodName}\n`),
    );
    this.ctx.writeToStdout('\n');
  }
}
