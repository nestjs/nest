import * as JsonSocket from 'json-socket';
import { ClientProxy } from './client-proxy';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { WritePacket, ReadPacket } from './../interfaces';
export declare class ClientTCP extends ClientProxy {
    private readonly logger;
    private readonly port;
    private readonly host;
    private isConnected;
    private socket;
    constructor(options: ClientOptions);
    connect(): Promise<any>;
    handleResponse(socket: JsonSocket, callback: (packet: WritePacket) => any, buffer: WritePacket, context: Function): any;
    createSocket(): JsonSocket;
    close(): void;
    bindEvents(socket: JsonSocket): void;
    handleError(err: any): void;
    handleClose(): void;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Promise<void>;
}
