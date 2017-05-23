import { MicroserviceConfiguration } from '@nestjs/microservices';
import { INestMicroservice } from './index';

export interface INestApplication {
    init(): void;
    listen(port: number, callback?: () => void);
    setGlobalPrefix(prefix: string): void;
    connectMicroservice(config: MicroserviceConfiguration): INestMicroservice;
    getMicroservices(): INestMicroservice[];
    startAllMicroservices(callback: () => void): void;
    close(): void;
}