import { Logger } from '@nestjs/common/services/logger.service';
import { Observable } from 'rxjs';
import { MqttClient } from '../external/mqtt-client.interface';
import { ReadPacket, WritePacket } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
export declare class ClientMqtt extends ClientProxy {
    protected readonly options: ClientOptions['options'];
    protected readonly logger: Logger;
    protected readonly url: string;
    protected mqttClient: MqttClient;
    protected connection: Promise<any>;
    constructor(options: ClientOptions['options']);
    getAckPatternName(pattern: string): string;
    getResPatternName(pattern: string): string;
    close(): void;
    connect(): Promise<any>;
    mergeCloseEvent<T = any>(instance: MqttClient, source$: Observable<T>): Observable<T>;
    createClient(): MqttClient;
    handleError(client: MqttClient): void;
    createResponseCallback(): (channel: string, buffer) => any;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Function;
}
