import type { Type } from '@nestjs/common';
import { MetadataScanner } from '../../metadata-scanner.js';
import { ReplFunction } from '../repl-function.js';
import type { ReplFnDefinition } from '../repl.interfaces.js';
import { clc, isNil, isPlainObject } from '@nestjs/common/internal';

export class MethodsReplFn extends ReplFunction {
  public fnDefinition: ReplFnDefinition = {
    name: 'methods',
    description:
      'Display all public methods available on a given provider or controller.',
    signature: '(token: ClassRef | string) => void',
  };

  action(token: Type<unknown> | string): void {
    const proto =
      typeof token !== 'function'
        ? this.getMethodsHost(this.ctx.app.get(token))
        : token?.prototype;

    const methods = new MetadataScanner().getAllMethodNames(proto);

    this.ctx.writeToStdout('\n');
    this.ctx.writeToStdout(`${clc.green('Methods')}:\n`);
    methods.forEach(methodName =>
      this.ctx.writeToStdout(` ${clc.yellow('◻')} ${methodName}\n`),
    );
    this.ctx.writeToStdout('\n');
  }

  private getMethodsHost(instance: unknown): object | null {
    if (isNil(instance)) {
      return null;
    }
    // A plain object (e.g., a `useValue` provider) holds its methods as own
    // properties, while its prototype only has the `Object.prototype` built-ins.
    return isPlainObject(instance) ? instance : Object.getPrototypeOf(instance);
  }
}
