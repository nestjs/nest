import { Observable } from 'rxjs/Observable';

export interface MessageHandlers {
    [pattern: string]: (data: any) => Promise<Observable<any>>;
}
