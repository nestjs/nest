import JsonSocket = require('json-socket');

import * as net from 'net';

import { ClientMetadata } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
import { Logger } from '@nestjs/common';

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = 'localhost';
const CONNECT_EVENT = 'connect';
const MESSAGE_EVENT = 'message';
const ERROR_EVENT = 'error';
const CLOSE_EVENT = 'close';

export class ClientTCP extends ClientProxy {
    private readonly logger = new Logger(ClientTCP.name);
    private readonly port: number;
    private readonly host: string;
    private isConnected = false;
    private socket: net.Socket;

    constructor({ port, host }: ClientMetadata) {
        super();
        this.port = port || DEFAULT_PORT;
        this.host = host || DEFAULT_HOST;
    }

    public init(): Promise<{}> {
        this.socket = this.createSocket();
        return new Promise((resolve) => {
            this.socket.on(CONNECT_EVENT, () => {
                this.isConnected = true;
                this.bindEvents(this.socket);
                resolve(this.socket);
            });
            this.socket.connect(this.port, this.host);
        });
    }

    protected async sendSingleMessage(msg: any, callback: (...args: any[]) => any) {
        const sendMessage = (sock: any) => {
            sock.sendMessage(msg);
            sock.on(MESSAGE_EVENT, (buffer: any) => this.handleResponse(sock, callback, buffer));
        };
        if (this.isConnected) {
            sendMessage(this.socket);
            return Promise.resolve();
        }
        const socket = await this.init();
        sendMessage(socket);
    }

    public handleResponse(socket: net.Socket, callback: (...args: any[]) => any, buffer: any) {
        const { err, response, disposed } = buffer;
        if (disposed) {
            callback(null, null, true);
            socket.end();
            return;
        }
        callback(err, response);
    }

    public createSocket() {
        return new JsonSocket(new net.Socket());
    }

    public close() {
        if (this.socket) {
            this.socket.end();
            this.isConnected = false;
            this.socket = null;
        }
    }

    public bindEvents(socket: net.Socket) {
        socket.on(ERROR_EVENT, (err: string) => this.logger.error(err));
        socket.on(CLOSE_EVENT, () => {
            this.isConnected = false;
            this.socket = null;
        });
    }
}
