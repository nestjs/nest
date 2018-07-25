import { CustomTransportStrategy, MicroserviceOptions } from '../interfaces';
import { Server } from './server';
export declare class ServerFactory {
    static create(options: MicroserviceOptions): Server & CustomTransportStrategy;
}
