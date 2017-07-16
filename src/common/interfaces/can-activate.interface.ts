import { Observable } from 'rxjs/Observable';

export interface CanActivate {
    canActivate(request, controller, method): boolean | Promise<boolean> | Observable<boolean>;
}