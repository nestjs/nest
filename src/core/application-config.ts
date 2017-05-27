import { IoAdapter } from '@nestjs/websockets/adapters/io-adapter';
import { WebSocketAdapter } from '@nestjs/common/interfaces';

export class ApplicationConfig {
    private globalPrefix = '';
    private ioAdapter: WebSocketAdapter = IoAdapter as any;

    public setGlobalPrefix(prefix: string) {
        this.globalPrefix = prefix;
    }

    public getGlobalPrefix() {
        return this.globalPrefix;
    }

    public setIoAdapter(ioAdapter: WebSocketAdapter) {
        this.ioAdapter = ioAdapter;
    }

    public getIoAdapter(): WebSocketAdapter {
        return this.ioAdapter;
    }
}