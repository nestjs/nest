import * as net from 'net';
import { Server as NetSocket } from 'net';
import * as JsonSocket from 'json-socket';
import { NO_PATTERN_MESSAGE } from '../constants';
import { Server } from './server';

export class ServerTCP extends Server {
    private readonly DEFAULT_PORT = 3000;
    private readonly port: number;
    private server: NetSocket;

    constructor(config) {
        super();
        this.port = config.port || this.DEFAULT_PORT;
        this.init();
    }

    public listen(callback: () => void) {
        this.server.listen(this.port, callback);
    }

    public close() {
        this.server.close();
    }

    public bindHandler(socket) {
        const sock = this.getSocketInstance(socket);
        sock.on('message', (msg) => this.handleMessage(sock, msg));
    }

    public handleMessage(socket, msg: { pattern: any, data: {} }) {
        const pattern = JSON.stringify(msg.pattern);
        if (!this.msgHandlers[pattern]) {
            socket.sendMessage({ err: NO_PATTERN_MESSAGE });
            return;
        }

        const handler = this.msgHandlers[pattern];
        handler(msg.data, this.getMessageHandler(socket));
    }

    public getMessageHandler(socket) {
        return (err, response) => {
            if (!response) {
                const respond = err;
                socket.sendMessage({ err: null, response: respond });
                return;
            }
            socket.sendMessage({ err, response });
        };
    }

    private init() {
        this.server = net.createServer(this.bindHandler.bind(this));
        this.server.on('error', this.handleError.bind(this));
    }

    private getSocketInstance(socket) {
        return new JsonSocket(socket);
    }

}