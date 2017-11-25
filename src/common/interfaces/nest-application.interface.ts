import { MicroserviceConfiguration } from '@nestjs/microservices';
import { INestMicroservice, ExceptionFilter, PipeTransform } from './index';
import { WebSocketAdapter } from './web-socket-adapter.interface';
import { CanActivate } from './can-activate.interface';
import { NestInterceptor } from './nest-interceptor.interface';

export interface INestApplication {
    /**
     * Initializes application. It is not necessary to call this method directly.
     *
     * @returns Promise
     */
    init(): Promise<void>;

    /**
     * The wrapper function around native `express.use()` method.
     * Example `app.use(cors())`
     *
     * @returns void
     */
    use(...args): void;

    /**
     * Starts the application.
     *
     * @param  {number} port
     * @param  {string} hostname
     * @param  {Function} callback Optional callback
     * @returns Promise
     */
    listen(port: number, callback?: () => void): Promise<any>;
    listen(port: number, hostname: string, callback?: () => void): Promise<any>;

    /**
     * Starts the application and can be awaited.
     *
     * @param  {number} port
     * @param  {string} hostname (optional)
     * @returns Promise
     */
    listenAsync(port: number, hostname?: string): Promise<any>;

    /**
     * Setups the prefix for the every HTTP route path
     *
     * @param  {string} prefix The prefix for the every HTTP route path (for example `/v1/api`)
     * @returns void
     */
    setGlobalPrefix(prefix: string): void;

    /**
     * Setup Web Sockets Adapter, which will be used inside Gateways.
     * Use, when you want to override default `socket.io` library.
     *
     * @param  {WebSocketAdapter} adapter
     * @returns void
     */
    useWebSocketAdapter(adapter: WebSocketAdapter): void;

    /**
     * Connects microservice to the NestApplication instance. It transforms application to the hybrid instance.
     *
     * @param  {MicroserviceConfiguration} config Microservice configuration objet
     * @returns INestMicroservice
     */
    connectMicroservice(config: MicroserviceConfiguration): INestMicroservice;

    /**
     * Returns array of the connected microservices to the NestApplication.
     *
     * @returns INestMicroservice[]
     */
    getMicroservices(): INestMicroservice[];

    /**
     * Starts all the connected microservices asynchronously
     *
     * @param  {Function} callback Optional callback function
     * @returns void
     */
    startAllMicroservices(callback?: () => void): void;

    /**
     * Starts all the connected microservices and can be awaited
     *
     * @returns Promise
     */
    startAllMicroservicesAsync(): Promise<void>;

    /**
     * Setups exception filters as a global filters (will be used within every HTTP route handler)
     *
     * @param  {ExceptionFilter[]} ...filters
     */
    useGlobalFilters(...filters: ExceptionFilter[]);

    /**
     * Setups pipes as a global pipes (will be used within every HTTP route handler)
     *
     * @param  {PipeTransform[]} ...pipes
     */
    useGlobalPipes(...pipes: PipeTransform<any>[]);

    /**
     * Setups interceptors as a global interceptors (will be used within every HTTP route handler)
     *
     * @param  {NestInterceptor[]} ...interceptors
     */
    useGlobalInterceptors(...interceptors: NestInterceptor[]);

    /**
     * Setups guards as a global guards (will be used within every HTTP route handler)
     *
     * @param  {CanActivate[]} ...guards
     */
    useGlobalGuards(...guards: CanActivate[]);

    /**
     * Terminates the application (both NestApplication, Web Socket Gateways and every connected microservice)
     *
     * @returns void
     */
    close(): void;
}