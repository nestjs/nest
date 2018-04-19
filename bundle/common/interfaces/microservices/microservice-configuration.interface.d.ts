import { CustomTransportStrategy } from './custom-transport-strategy.interface';
import { Transport } from './../../enums/transport.enum';
export interface MicroserviceConfiguration {
    transport?: Transport;
    url?: string;
    port?: number;
    host?: string;
    retryAttempts?: number;
    retryDelay?: number;
    strategy?: CustomTransportStrategy;
}
