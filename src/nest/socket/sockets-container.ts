import "reflect-metadata";
import { Subject, ReplaySubject } from "rxjs";

export class SocketsContainer {
    private IOSubjects = new Map<string, SocketEvents>();

    getSocketSubjects(namespaceFilter: string): SocketEvents {
        return this.IOSubjects.get(namespaceFilter);
    }

    storeSocketSubjects(namespaceFilter: string, observableServer: SocketEvents) {
        this.IOSubjects.set(namespaceFilter, observableServer);
    }

}

export interface SocketEvents {
    server: any;
    init: ReplaySubject<any>;
    connection: Subject<any>;
}