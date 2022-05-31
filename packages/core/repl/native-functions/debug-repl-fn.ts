import type { Type, InjectionToken } from '@nestjs/common';
import { clc } from '@nestjs/common/utils/cli-colors.util';
import { ReplFunction } from '../repl-function';
import type { ModuleDebugEntry } from '../repl-context';
import type { ReplFnDefinition } from '../repl.interfaces';

export class DebugReplFn extends ReplFunction {
  public fnDefinition: ReplFnDefinition = {
    name: 'debug',
    description:
      'Allows you to process the identification of the problem in stages, isolating the source of the problem and then correcting the problem or determining a way to solve it.',
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
