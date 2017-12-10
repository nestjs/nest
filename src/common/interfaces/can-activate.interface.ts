import { ExecutionContext } from './execution-context.interface';
import { Observable } from 'rxjs/Observable';
import { Request } from 'express';

export interface CanActivate {
    canActivate(request: Request & any, context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean>;
}
