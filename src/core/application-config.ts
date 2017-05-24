import { IoAdapter } from '@nestjs/websockets/adapters/io-adapter';
import { SocketIoAdapter } from '@nestjs/common/interfaces';

export class ApplicationConfig {
    private globalPrefix = '';
    private ioAdapter: SocketIoAdapter = IoAdapter as any;

    public setGlobalPrefix(prefix: string) {
        this.globalPrefix = prefix;
    }

    public getGlobalPrefix() {
        return this.globalPrefix;
    }

    public setIoAdapter(ioAdapter: SocketIoAdapter) {
        this.ioAdapter = ioAdapter;
    }

    public getIoAdapter(): SocketIoAdapter {
        return this.ioAdapter;
    }
}