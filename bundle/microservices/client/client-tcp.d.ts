import * as JsonSocket from 'json-socket';
import { PacketId, ReadPacket, WritePacket } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
export declare class ClientTCP extends ClientProxy {
    protected connection: Promise<any>;
    private readonly logger;
    private readonly port;
    private readonly host;
    private isConnected;
    private socket;
    constructor(options: ClientOptions['options']);
    connect(): Promise<any>;
    handleResponse(buffer: WritePacket & PacketId): any;
    createSocket(): JsonSocket;
    close(): void;
    bindEvents(socket: JsonSocket): void;
    handleError(err: any): void;
    handleClose(): void;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Function;
}
