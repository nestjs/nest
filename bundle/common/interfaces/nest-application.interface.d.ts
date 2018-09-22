import { CorsOptions } from './external/cors-options.interface';
import { CanActivate } from './features/can-activate.interface';
import { NestInterceptor } from './features/nest-interceptor.interface';
import { HttpServer } from './http/http-server.interface';
import { ExceptionFilter, INestMicroservice, PipeTransform } from './index';
import { MicroserviceOptions } from './microservices/microservice-configuration.interface';
import { INestApplicationContext } from './nest-application-context.interface';
import { WebSocketAdapter } from './websockets/web-socket-adapter.interface';
export interface INestApplication extends INestApplicationContext {
    /**
     * Initializes application. It is not mandatory to call this method directly.
     *
     * @returns {Promise}
     */
    init(): Promise<this>;
    /**
     * A wrapper function around HTTP adapter method: `adapter.use()`.
     * Example `app.use(cors())`
     *
     * @returns {void}
     */
    use(...args: any[]): this;
    /**
     * Enables CORS (Cross-Origin Resource Sharing)
     *
     * @returns {void}
     */
    enableCors(options?: CorsOptions): this;
    /**
     * Starts the application.
     *
     * @param  {number} port
     * @param  {string} hostname
     * @param  {Function} callback Optional callback
     * @returns {Promise}
     */
    listen(port: number | string, callback?: () => void): Promise<any>;
    listen(port: number | string, hostname: string, callback?: () => void): Promise<any>;
    /**
     * Starts the application (can be awaited).
     *
     * @param  {number} port
     * @param  {string} hostname (optional)
     * @returns {Promise}
     */
    listenAsync(port: number | string, hostname?: string): Promise<any>;
    /**
     * Registers the prefix for the every HTTP route path
     *
     * @param  {string} prefix The prefix for the every HTTP route path (for example `/v1/api`)
     * @returns {void}
     */
    setGlobalPrefix(prefix: string): this;
    /**
     * Setup Ws Adapter which will be used inside Gateways.
     * Use, when you want to override default `socket.io` library.
     *
     * @param  {WebSocketAdapter} adapter
     * @returns {void}
     */
    useWebSocketAdapter(adapter: WebSocketAdapter): this;
    /**
     * Connects microservice to the NestApplication instance. Transforms application to the hybrid instance.
     *
     * @param  {MicroserviceOptions} options Microservice options object
     * @returns {INestMicroservice}
     */
    connectMicroservice(options: MicroserviceOptions): INestMicroservice;
    /**
     * Returns array of the microservices connected to the NestApplication.
     *
     * @returns {INestMicroservice[]}
     */
    getMicroservices(): INestMicroservice[];
    /**
     * Returns an underlying, native HTTP server.
     *
     * @returns {http.Server}
     */
    getHttpServer(): any;
    /**
     * Returns an underlying HTTP adapter.
     *
     * @returns {HttpServer}
     */
    getHttpAdapter(): HttpServer;
    /**
     * Starts all connected microservices asynchronously
     *
     * @param  {Function} callback Optional callback function
     * @returns {void}
     */
    startAllMicroservices(callback?: () => void): this;
    /**
     * Starts all connected microservices and can be awaited
     *
     * @returns {Promise}
     */
    startAllMicroservicesAsync(): Promise<void>;
    /**
     * Registers exception filters as a global filters (will be used within every HTTP route handler)
     *
     * @param  {ExceptionFilter[]} ...filters
     */
    useGlobalFilters(...filters: ExceptionFilter[]): this;
    /**
     * Registers pipes as a global pipes (will be used within every HTTP route handler)
     *
     * @param  {PipeTransform[]} ...pipes
     */
    useGlobalPipes(...pipes: PipeTransform<any>[]): this;
    /**
     * Registers interceptors as a global interceptors (will be used within every HTTP route handler)
     *
     * @param  {NestInterceptor[]} ...interceptors
     */
    useGlobalInterceptors(...interceptors: NestInterceptor[]): this;
    /**
     * Registers guards as a global guards (will be used within every HTTP route handler)
     *
     * @param  {CanActivate[]} ...guards
     */
    useGlobalGuards(...guards: CanActivate[]): this;
    /**
     * Terminates the application (including NestApplication, Gateways, and each connected microservice)
     *
     * @returns {Promise<void>}
     */
    close(): Promise<void>;
}
