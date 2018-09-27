import { ServerFeatureOptions } from './server-feature-options.interface';

export interface HttpServerOptions extends ServerFeatureOptions {
  httpsOptions?: {};
  hostname?: string;
  port: number;
}
