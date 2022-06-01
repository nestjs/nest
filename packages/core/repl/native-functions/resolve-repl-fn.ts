import type { Type } from '@nestjs/common';
import { ReplFunction } from '../repl-function';
import type { ReplFnDefinition } from '../repl.interfaces';

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
