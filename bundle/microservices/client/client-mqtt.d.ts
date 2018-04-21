/// <reference types="node" />
import { MqttClient } from 'mqtt';
import { ClientProxy } from './client-proxy';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { WritePacket } from './../interfaces';
import { ReadPacket } from './../interfaces';
export declare class ClientMqtt extends ClientProxy {
    private readonly options;
    private readonly logger;
    private readonly url;
    private mqttClient;
    constructor(options: ClientOptions);
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): (channel: string, buffer: Buffer) => any;
    getAckPatternName(pattern: string): string;
    getResPatternName(pattern: string): string;
    close(): void;
    init(callback: (...args) => any): void;
    createClient(): MqttClient;
    handleError(client: MqttClient, callback: (...args) => any): void;
}
