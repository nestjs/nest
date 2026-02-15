import type { InjectionToken, Type } from '@nestjs/common';
import type { ModuleDebugEntry } from '../repl-context.js';
import { ReplFunction } from '../repl-function.js';
import type { ReplFnDefinition } from '../repl.interfaces.js';
import { clc } from '@nestjs/common/internal';

export class DebugReplFn extends ReplFunction {
  public fnDefinition: ReplFnDefinition = {
    name: 'debug',
    description:
      'Print all registered modules as a list together with their controllers and providers.\nIf the argument is passed in, for example, "debug(MyModule)" then it will only print components of this specific module.',
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
      for (const [moduleKey, entry] of Object.entries(this.ctx.debugRegistry)) {
        this.printCtrlsAndProviders(moduleKey, entry);
      }
    }
    this.ctx.writeToStdout('\n');
  }

  private printCtrlsAndProviders(
    moduleName: string,
    moduleDebugEntry: ModuleDebugEntry,
  ) {
    this.ctx.writeToStdout(`${clc.green(moduleName)}:\n`);
    this.printCollection('controllers', moduleDebugEntry['controllers']);
    this.printCollection('providers', moduleDebugEntry['providers']);
  }

  private printCollection(
    title: string,
    collectionValue: Record<string, InjectionToken>,
  ) {
    const collectionEntries = Object.keys(collectionValue);
    if (collectionEntries.length <= 0) {
      return;
    }

    this.ctx.writeToStdout(` ${clc.yellow(`- ${title}`)}:\n`);
    collectionEntries.forEach(provider =>
      this.ctx.writeToStdout(`  ${clc.green('◻')} ${provider}\n`),
    );
  }
}
