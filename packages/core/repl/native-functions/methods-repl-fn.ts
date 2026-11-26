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
        : this.getClassTokenMethodsHost(token);

    const methods = new MetadataScanner().getAllMethodNames(proto);

    this.ctx.writeToStdout('\n');
    this.ctx.writeToStdout(`${clc.green('Methods')}:\n`);
    methods.forEach(methodName =>
      this.ctx.writeToStdout(` ${clc.yellow('◻')} ${methodName}\n`),
    );
    this.ctx.writeToStdout('\n');
  }

  /**
   * A class token may stand for a provider of another class (`useClass`), a
   * value (`useValue`) or what a factory returns (`useFactory`), so the
   * methods are read from the resolved instance. The prototype of the class is
   * used when there is no instance to get: a class that is not registered, or
   * a request-scoped or transient provider.
   */
  private getClassTokenMethodsHost(token: Type<unknown>): object | null {
    let instance: unknown;
    try {
      instance = this.ctx.app.get(token);
    } catch {
      return token.prototype;
    }
    return isNil(instance) ? token.prototype : this.getMethodsHost(instance);
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
