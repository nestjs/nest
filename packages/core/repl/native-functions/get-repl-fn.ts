import type { Type } from '@nestjs/common';
import { ReplFunction } from '../repl-function.js';
import type { ReplFnDefinition } from '../repl.interfaces.js';

export class GetReplFn extends ReplFunction {
  public fnDefinition: ReplFnDefinition = {
    name: 'get',
    signature: '(token: InjectionToken) => any',
    description:
      'Retrieves an instance of either injectable or controller, otherwise, throws exception.',
    aliases: ['$'],
  };

  action(token: string | symbol | Function | Type<any>): any {
    return this.ctx.app.get(token);
  }
}
