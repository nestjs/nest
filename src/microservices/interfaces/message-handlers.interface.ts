import { Observable } from 'rxjs/Observable';

export interface MessageHandlers {
    [pattern: string]: (data) => Observable<any>;
}