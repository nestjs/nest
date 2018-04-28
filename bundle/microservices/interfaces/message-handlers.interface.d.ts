import { Observable } from 'rxjs';
export interface MessageHandlers {
    [pattern: string]: (data) => Promise<Observable<any>>;
}
