import {
  CorsOptions,
  CorsOptionsDelegate,
} from './external/cors-options.interface.js';
import { HttpsOptions } from './external/https-options.interface.js';
import { NestApplicationContextOptions } from './nest-application-context-options.interface.js';

/**
 * @publicApi
 */
export interface NestApplicationOptions extends NestApplicationContextOptions {
  /**
   * CORS options from [CORS package](https://github.com/expressjs/cors#configuration-options)
   */
  cors?: boolean | CorsOptions | CorsOptionsDelegate<any>;
  /**
   * Whether to use underlying platform body parser.
   */
  bodyParser?: boolean;
  /**
   * Set of configurable HTTPS options
   */
  httpsOptions?: HttpsOptions;
  /**
   * Whether to register the raw request body on the request. Use `req.rawBody`.
   */
  rawBody?: boolean;
  /**
   * Force close open HTTP connections. Useful if restarting your application hangs due to
   * keep-alive connections in the HTTP adapter.
   */
  forceCloseConnections?: boolean;
  /**
   * Whether to enable graceful shutdown behavior.
   * When enabled, the server will return 503 Service Unavailable for new requests
   * during the shutdown process, but allow existing in-flight requests to complete.
   * @default false
   */
  gracefulShutdown?: boolean;
}
