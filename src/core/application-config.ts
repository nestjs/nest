import { IoAdapter } from '@nestjs/websockets/adapters/io-adapter';
import { PipeTransform, WebSocketAdapter, ExceptionFilter } from '@nestjs/common';

export class ApplicationConfig {
    private globalPipes: PipeTransform<any>[] = [];
    private globalFilters: ExceptionFilter[] = [];
    private ioAdapter: WebSocketAdapter = new IoAdapter();
    private globalPrefix = '';

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

    public useGlobalPipes(...pipes: PipeTransform<any>[]) {
        this.globalPipes = pipes;
    }

    public getGlobalFilters(): ExceptionFilter[] {
        return this.globalFilters;
    }

    public useGlobalFilters(...filters: ExceptionFilter[]) {
        this.globalFilters = filters;
    }

    public getGlobalPipes(): PipeTransform<any>[] {
        return this.globalPipes;
    }
}