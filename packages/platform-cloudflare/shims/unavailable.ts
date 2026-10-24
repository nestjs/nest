/**
 * Stands in for the optional Nest packages that the core imports on demand
 * (e.g. `@nestjs/microservices`, `@nestjs/websockets`), when they are not
 * installed. Aliasing them to this module in `wrangler.jsonc` lets the bundler
 * resolve those imports, and the core handles the rejected import as it does
 * for a package that is missing on Node.js.
 */
throw new Error(
  'This package is not available on Cloudflare Workers: it is aliased to "@nestjs/platform-cloudflare/shims/unavailable" in the Wrangler configuration.',
);

export {};
