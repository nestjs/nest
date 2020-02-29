import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable({ scope: Scope.REQUEST })
export class Guard implements CanActivate {
  static COUNTER = 0;
  static REQUEST_SCOPED_DATA = [];

  constructor(@Inject('REQUEST_ID') private readonly requestId: number) {
    Guard.COUNTER++;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    Guard.REQUEST_SCOPED_DATA.push(this.requestId);
    return true;
  }
}
