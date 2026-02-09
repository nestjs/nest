import type { Type } from '@nestjs/common';
import { clc } from '@nestjs/common/utils/cli-colors.util.js';
import { MetadataScanner } from '../../metadata-scanner.js';
import { ReplFunction } from '../repl-function.js';
import type { ReplFnDefinition } from '../repl.interfaces.js';

export class MethodsReplFn extends ReplFunction {
  public fnDefinition: ReplFnDefinition = {
    name: 'methods',
    description:
      'Display all public methods available on a given provider or controller.',
    signature: '(token: ClassRef | string) => void',
  };

  private readonly metadataScanner = new MetadataScanner();

  action(token: Type<unknown> | string): void {
    const proto =
      typeof token !== 'function'
        ? Object.getPrototypeOf(this.ctx.app.get(token))
        : token?.prototype;

    const methods = this.metadataScanner.getAllMethodNames(proto);

    this.ctx.writeToStdout('\n');
    this.ctx.writeToStdout(`${clc.green('Methods')}:\n`);
    methods.forEach(methodName =>
      this.ctx.writeToStdout(` ${clc.yellow('◻')} ${methodName}\n`),
    );
    this.ctx.writeToStdout('\n');
  }
}
