import { ServerTCP } from './server-tcp';
import { ServerRedis } from './server-redis';
import { MicroserviceConfiguration } from '../interfaces/microservice-configuration.interface';
import { Server } from './server';
import { Transport } from '../../common/enums/transport.enum';

export class ServerFactory {
    public static create(config: MicroserviceConfiguration): Server {
        const { transport } = config;

        switch (transport) {
            case Transport.REDIS: return new ServerRedis(config);
            default: return new ServerTCP(config);
        }
    }
}