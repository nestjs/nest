import { HttpsOptions } from './external/https-options.interface';
import { NestApplicationContextOptions } from './nest-application-context-options.interface';
import { CorsOptions } from './external/cors-options.interface';

/**
 * @publicApi
 */
export interface NestApplicationOptions extends NestApplicationContextOptions {
  /**
   * CORS options from [Express CORS package](https://github.com/expressjs/cors#configuration-options)
   */
  cors?: boolean | CorsOptions;
  /**
   * Whether to use underlying platform body parser.
   */
  bodyParser?: boolean;
  /**
   * Set of configurable HTTPS options
   */
  httpsOptions?: HttpsOptions;
}
