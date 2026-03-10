import { ModuleMetadata } from '@nestjs/common';

export interface TrpcModuleOptions {
  /**
   * Path to mount the tRPC handler on.
   * @default '/trpc'
   */
  path?: string;

  /**
   * A factory function that creates the tRPC context for each request.
   * Receives the raw request/response objects from the underlying HTTP adapter.
   */
  createContext?: (opts: { req: any; res: any }) => any;

  /**
   * Whether to register the module globally.
   * @default false
   */
  isGlobal?: boolean;
}

export interface TrpcModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  useFactory: (
    ...args: any[]
  ) => TrpcModuleOptions | Promise<TrpcModuleOptions>;
  inject?: any[];
  extraProviders?: any[];
  isGlobal?: boolean;
}

export interface TrpcProcedureMetadata {
  name: string;
  type: string;
  inputSchema?: any;
  outputSchema?: any;
}

export interface TrpcRouterMetadata {
  /**
   * Prefix for all procedures in this router.
   * Nested under this key in the merged tRPC router.
   */
  alias?: string;
}
