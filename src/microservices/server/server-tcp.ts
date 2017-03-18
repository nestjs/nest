import * as net from 'net';
import { Server as NetSocket } from 'net';
import * as jsock from 'json-socket';
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

    listen(callback: () => void) {
        this.server.listen(this.port, callback);
    }

    private init() {
        this.server = net.createServer(this.bindHandler.bind(this));
        this.server.on('error', this.handleError.bind(this));
    }

    private bindHandler(socket) {
        const sock = new jsock(socket);
        sock.on('message', (msg) => this.handleMessage(sock, msg));
    }

    private handleMessage(socket, msg: { pattern: any, data: {} }) {
        const pattern = JSON.stringify(msg.pattern);
        if (!this.msgHandlers[pattern]) {
            socket.sendMessage({ err: NO_PATTERN_MESSAGE });
            return;
        }

        this.msgHandlers[pattern](msg.data, (err, response) => {
            if (!response) {
                const respond = err;
                socket.sendMessage({ err: null, response: respond });
                return;
            }
            socket.sendMessage({ err, response });
        });
    }

}