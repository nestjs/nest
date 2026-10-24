import { Global, Module } from '@nestjs/common';
import { CloudflareContext } from './cloudflare-context.js';

/**
 * Makes {@link CloudflareContext} injectable in every module of the
 * application. Import it once, in the root module.
 *
 * @publicApi
 */
@Global()
@Module({
  providers: [CloudflareContext],
  exports: [CloudflareContext],
})
export class CloudflareModule {}
