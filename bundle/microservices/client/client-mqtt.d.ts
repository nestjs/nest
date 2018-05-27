import { MqttClient } from '../external/mqtt-client.interface';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ReadPacket, WritePacket } from './../interfaces';
import { ClientProxy } from './client-proxy';
export declare class ClientMqtt extends ClientProxy {
    private readonly options;
    private readonly logger;
    private readonly url;
    private mqttClient;
    constructor(options: ClientOptions);
    getAckPatternName(pattern: string): string;
    getResPatternName(pattern: string): string;
    close(): void;
    connect(): Promise<any>;
    createClient(): MqttClient;
    handleError(client: MqttClient): void;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Promise<any>;
}
