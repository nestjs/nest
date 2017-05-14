import { Transport } from '@nestjs/common/enums/transport.enum';

export interface MicroserviceConfiguration {
    transport?: Transport;
    url?: string;
    port?: number;
    host?: string;
}