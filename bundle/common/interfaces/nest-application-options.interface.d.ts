import { HttpsOptions } from './external/https-options.interface';
import { NestApplicationContextOptions } from './nest-application-context-options.interface';
import { CorsOptions } from './external/cors-options.interface';
export interface NestApplicationOptions extends NestApplicationContextOptions {
    cors?: boolean | CorsOptions;
    bodyParser?: boolean;
    httpsOptions?: HttpsOptions;
}
