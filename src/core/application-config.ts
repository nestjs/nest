import { IoAdapter } from '@nestjs/websockets/adapters/io-adapter';
import { CanActivate } from './interfaces/can-activate.interface';
import { ConfigurationProvider } from './interfaces/configuration-provider.interface';
import { ExceptionFilter } from './interfaces/exceptions/exception-filter.interface';
import { NestInterceptor } from './interfaces/nest-interceptor.interface';
import { PipeTransform } from './interfaces/pipe-transform.interface';
import { WebSocketAdapter } from './interfaces/web-socket-adapter.interface';

export class ApplicationConfig implements ConfigurationProvider {
    private globalPipes: PipeTransform<any>[] = [];
    private globalFilters: ExceptionFilter[] = [];
    private globalInterceptors: NestInterceptor[] = [];
    private globalGuards: CanActivate[] = [];
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

    public getGlobalInterceptors(): NestInterceptor[] {
        return this.globalInterceptors;
    }

    public useGlobalInterceptors(...interceptors: NestInterceptor[]) {
        this.globalInterceptors = interceptors;
    }

    public getGlobalGuards(): CanActivate[] {
        return this.globalGuards;
    }

    public useGlobalGuards(...guards: CanActivate[]) {
        this.globalGuards = guards;
    }
}
