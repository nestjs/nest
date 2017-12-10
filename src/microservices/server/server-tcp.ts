import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/empty';
import 'rxjs/add/operator/finally';

import * as net from 'net';

import { CustomTransportStrategy } from './../interfaces/custom-transport-strategy.interface';
import { MicroserviceConfiguration } from '../interfaces/microservice-configuration.interface';
import { NO_PATTERN_MESSAGE } from '../constants';
import { Server as NetSocket } from 'net';
import { Observable } from 'rxjs/Observable';
import { Server } from './server';

import JsonSocket = require('json-socket');

const DEFAULT_PORT = 3000;
const MESSAGE_EVENT = 'message';
const ERROR_EVENT = 'error';

export class ServerTCP extends Server implements CustomTransportStrategy {
    private readonly port: number;
    private server: NetSocket;

    constructor(config: MicroserviceConfiguration) {
        super();
        this.port = config.port || DEFAULT_PORT;
        this.init();
    }

    public listen(callback: () => void) {
        this.server.listen(this.port, callback);
    }

    public close() {
        this.server.close();
    }

    public bindHandler(socket: JsonSocket) {
        const sock = this.getSocketInstance(socket);
        sock.on(MESSAGE_EVENT, async (msg: {
            pattern: any;
            data: {};
        }) => await this.handleMessage(sock, msg));
    }

    public async handleMessage(socket: any, msg: { pattern: any, data: {} }) {
        const pattern = JSON.stringify(msg.pattern);
        const status = 'error';
        if (!this.messageHandlers[pattern]) {
            socket.sendMessage({ status, error: NO_PATTERN_MESSAGE });
            return;
        }

        const handler = this.messageHandlers[pattern];
        const response$ = this.transformToObservable(await handler(msg.data)) as Observable<any>;
        response$ && this.send(response$, socket.sendMessage.bind(socket));
    }

    private init() {
        this.server = net.createServer(this.bindHandler.bind(this));
        this.server.on(ERROR_EVENT, this.handleError.bind(this));
    }

    private getSocketInstance(socket: JsonSocket) {
        return new JsonSocket(socket);
    }

}
