import * as JsonSocket from 'json-socket';
import { ClientProxy } from './client-proxy';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { WritePacket } from './../interfaces';
import { ReadPacket } from 'src/microservices';
export declare class ClientTCP extends ClientProxy {
    private readonly logger;
    private readonly port;
    private readonly host;
    private isConnected;
    private socket;
    constructor({port, host}: ClientOptions);
    init(callback: (...args) => any): Promise<JsonSocket>;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Promise<void>;
    handleResponse(socket: JsonSocket, callback: (packet: WritePacket) => any, buffer: WritePacket, context: Function): any;
    createSocket(): JsonSocket;
    close(): void;
    bindEvents(socket: JsonSocket, callback: (...args) => any): void;
    handleError(err: any, callback: (...args) => any): void;
    handleClose(): void;
}
