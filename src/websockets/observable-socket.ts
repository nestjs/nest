import { ObservableSocketServer } from './interfaces/observable-socket-server.interface';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';

export class ObservableSocket {
    public static create(server: any): ObservableSocketServer {
        return {
            init: new ReplaySubject(),
            connection: new Subject(),
            disconnect: new Subject(),
            server,
        };
    }
}
