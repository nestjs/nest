import * as net from 'net';
import * as JsonSocket from 'json-socket';
import { ClientProxy } from './client-proxy';
import { ClientMetadata } from '../interfaces/client-metadata.interface';

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = 'localhost';
const CONNECT_EVENT = 'connect';
const MESSAGE_EVENT = 'message';

export class ClientTCP extends ClientProxy {
    private readonly port: number;
    private readonly host: string;

    constructor({ port, host }: ClientMetadata) {
        super();
        this.port = port || DEFAULT_PORT;
        this.host = host || DEFAULT_HOST;
    }

    public sendSingleMessage(msg, callback: (...args) => any) {
        const socket = this.createSocket();
        socket.connect(this.port, this.host);
        socket.on(CONNECT_EVENT, () => {
            socket.sendMessage(msg);
            socket.on(MESSAGE_EVENT, (buffer) => this.handleResponse(socket, callback, buffer));
        });
    }

    public handleResponse(socket, callback: (...args) => any, buffer) {
        const { err, response, disposed } = buffer;
        if (disposed) {
            callback(null, null, true);
            socket.close();
            return;
        }
        callback(err, response);
    }

    public createSocket() {
        return new JsonSocket(new net.Socket());
    }
}