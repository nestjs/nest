import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class NestedTransientService {
  static COUNTER = 0;
  public readonly instanceId: number;
  private context?: string;

  constructor() {
    NestedTransientService.COUNTER++;
    this.instanceId = NestedTransientService.COUNTER;
  }

  setContext(ctx: string) {
    this.context = ctx;
  }

  getContext(): string | undefined {
    return this.context;
  }
}
