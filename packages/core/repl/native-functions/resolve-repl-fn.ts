import type { Type } from '@nestjs/common';
import { ReplFunction } from '../repl-function.js';
import type { ReplFnDefinition } from '../repl.interfaces.js';

export class ResolveReplFn extends ReplFunction {
  public fnDefinition: ReplFnDefinition = {
    name: 'resolve',
    description:
      'Resolves transient or request-scoped instance of either injectable or controller, otherwise, throws exception.',
    signature: '(token: InjectionToken, contextId: any) => Promise<any>',
  };

  action(
    token: string | symbol | Function | Type<any>,
    contextId: any,
  ): Promise<any> {
    return this.ctx.app.resolve(token, contextId);
  }
}
