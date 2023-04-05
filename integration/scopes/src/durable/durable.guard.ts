import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Scope,
} from '@nestjs/common';
import { DurableService } from './durable.service';

@Injectable({ scope: Scope.REQUEST, durable: true })
export class DurableGuard implements CanActivate {
  public instanceCounter = 0;
  constructor(private readonly durableService: DurableService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (typeof this.durableService === 'undefined') {
      throw new Error('Durable service is undefined');
    }
    this.instanceCounter++;
    return true;
  }
}
