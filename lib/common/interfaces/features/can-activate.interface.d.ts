import { Observable } from 'rxjs/Observable';
import { ExecutionContext } from './execution-context.interface';
export interface CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean>;
}
