import { Observable } from 'rxjs/Observable';
import { ExecutionContext } from './execution-context.interface';

export interface CanActivate {
    canActivate(request, context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean>;
}