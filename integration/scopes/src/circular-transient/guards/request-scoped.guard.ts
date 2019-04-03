import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Scope,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable({ scope: Scope.TRANSIENT })
export class Guard implements CanActivate {
  static COUNTER = 0;
  constructor() {
    Guard.COUNTER++;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return true;
  }
}
