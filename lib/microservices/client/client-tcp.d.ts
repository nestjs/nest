import * as JsonSocket from 'json-socket';
import { ClientProxy } from './client-proxy';
import { ClientMetadata } from '../interfaces/client-metadata.interface';
export declare class ClientTCP extends ClientProxy {
    private readonly logger;
    private readonly port;
    private readonly host;
    private isConnected;
    private socket;
    constructor({port, host}: ClientMetadata);
    init(callback: (...args) => any): Promise<JsonSocket>;
    protected sendMessage(msg: any, callback: (...args) => any): Promise<void>;
    handleResponse(socket: JsonSocket, callback: (...args) => any, buffer: any, context: Function): any;
    createSocket(): JsonSocket;
    close(): void;
    bindEvents(socket: JsonSocket, callback: (...args) => any): void;
    handleError(err: any, callback: (...args) => any): void;
    handleClose(): void;
}
