import type {
  DynamicModule,
  INestApplicationContext,
  Type,
} from '@nestjs/common';
import { ReplFunction } from '../repl-function';
import type { ReplFnDefinition } from '../repl.interfaces';

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
