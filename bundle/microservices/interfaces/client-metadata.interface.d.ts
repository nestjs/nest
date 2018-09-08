import { Transport } from '../enums/transport.enum';
import { GrpcOptions, MqttOptions, NatsOptions, RedisOptions } from './microservice-configuration.interface';
export declare type ClientOptions = RedisOptions | NatsOptions | MqttOptions | GrpcOptions | TcpClientOptions;
export interface TcpClientOptions {
    transport: Transport.TCP;
    options?: {
        host?: string;
        port?: number;
    };
}
