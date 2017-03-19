import * as jsocket from 'json-socket';
import { ClientProxy } from './client-proxy';
import { ClientMetadata } from '../interfaces/client-metadata.interface';

export class ClientTCP extends ClientProxy {
    private readonly DEFAULT_HOST = 'localhost';
    private readonly DEFAULT_PORT = 3000;
    private readonly port: number;
    private readonly host: string;

    constructor({ port, host }: ClientMetadata) {
        super();

        this.port = port || this.DEFAULT_PORT;
        this.host = host || this.DEFAULT_HOST;
    }

    sendSingleMessage(msg, callback: Function) {
        jsocket.sendSingleMessageAndReceive(this.port, this.host, msg, this.createCallback(callback));
    }

    createCallback(callback: Function) {
        return (err, res) => {
            if (err) {
                callback(err);
                return;
            }
            callback(res.err, res.response);
        }
    }

}