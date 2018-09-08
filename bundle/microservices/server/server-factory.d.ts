import { CustomTransportStrategy, MicroserviceOptions } from '../interfaces';
import { Server } from './server';
export declare class ServerFactory {
    static create(microserviceOptions: MicroserviceOptions): Server & CustomTransportStrategy;
}
