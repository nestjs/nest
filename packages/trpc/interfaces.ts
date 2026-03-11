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

  /**
   * Path to the auto-generated TypeScript file that exports the typed `AppRouter`.
   *
   * When set, a `.ts` file is written at this path during module initialisation.
   * Clients can `import type { AppRouter }` from the generated file to get
   * full end-to-end type safety, mirroring `autoSchemaFile` from `@nestjs/graphql`.
   *
   * @example
   * ```ts
   * TrpcModule.forRoot({
   *   autoSchemaFile: join(process.cwd(), 'src/trpc-generated.ts'),
   * })
   * ```
   */
  autoSchemaFile?: string;
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

export interface TrpcRouterMetadata {
  /**
   * Prefix for all procedures in this router.
   * Nested under this key in the merged tRPC router.
   */
  alias?: string;
}
