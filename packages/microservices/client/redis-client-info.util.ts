/**
 * Get the client info tag for Redis connections.
 * Returns the NestJS version in the format "nestjs_v{version}" or "nestjs" as fallback.
 *
 * @returns The client info tag string
 */
export function getRedisClientInfoTag(): string {
  try {
    // Try to get NestJS version from package.json
    const nestVersion = require('@nestjs/microservices/package.json').version;
    return `nestjs_v${nestVersion}`;
  } catch {
    // Fallback if version cannot be determined
    return 'nestjs';
  }
}
