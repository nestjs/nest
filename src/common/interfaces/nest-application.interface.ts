import { MicroserviceConfiguration } from '@nestjs/microservices';
import { INestMicroservice } from './index';
import { SocketIoAdapter } from './socket-io-adapter.interface';

export interface INestApplication {
    init(): void;
    listen(port: number, callback?: () => void);
    setGlobalPrefix(prefix: string): void;
    setIoAdapter(adapter: SocketIoAdapter): void;
    connectMicroservice(config: MicroserviceConfiguration): INestMicroservice;
    getMicroservices(): INestMicroservice[];
    startAllMicroservices(callback: () => void): void;
    close(): void;
}