import { Transport } from '../enums/transport.enum';

export interface MicroserviceConfiguration {
    transport?: Transport;
    url?: string;
    port?: number;
    host?: string;
}