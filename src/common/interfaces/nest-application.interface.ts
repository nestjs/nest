import { MicroserviceConfiguration } from '@nestjs/microservices';
import { INestMicroservice } from './index';
import { WebSocketAdapter } from './web-socket-adapter.interface';

export interface INestApplication {
    init(): void;
    listen(port: number, callback?: () => void);
    setGlobalPrefix(prefix: string): void;
    useWebSocketAdapter(adapter: WebSocketAdapter): void;
    connectMicroservice(config: MicroserviceConfiguration): INestMicroservice;
    getMicroservices(): INestMicroservice[];
    startAllMicroservices(callback: () => void): void;
    close(): void;
}