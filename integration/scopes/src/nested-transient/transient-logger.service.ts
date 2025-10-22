import { Injectable, Scope } from '@nestjs/common';
import { NestedTransientService } from './nested-transient.service';

@Injectable({ scope: Scope.TRANSIENT })
export class TransientLoggerService {
  static COUNTER = 0;
  public readonly instanceId: number;

  constructor(public readonly nested: NestedTransientService) {
    TransientLoggerService.COUNTER++;
    this.instanceId = TransientLoggerService.COUNTER;
  }

  setContext(ctx: string) {
    this.nested.setContext(`NESTED-${ctx}`);
  }

  getNestedContext(): string | undefined {
    return this.nested.getContext();
  }

  getNestedInstanceId(): number {
    return this.nested.instanceId;
  }
}
