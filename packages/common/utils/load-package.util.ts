import { createRequire } from 'module';
import { Logger } from '../services/logger.service.js';

const MISSING_REQUIRED_DEPENDENCY = (name: string, reason: string) =>
  `The "${name}" package is missing. Please, make sure to install it to take advantage of ${reason}.`;

const logger = new Logger('PackageLoader');

/**
 * Cache of already-loaded packages keyed by package name.
 * Allows subsequent calls (including synchronous ones) to
 * return the module without another async import().
 */
const packageCache = new Map<string, any>();

export async function loadPackage(
  packageName: string,
  context: string,
  loaderFn?: Function,
) {
  const cached = packageCache.get(packageName);
  if (cached) {
    return cached;
  }
  try {
    const pkg = loaderFn ? await loaderFn() : await import(packageName);
    packageCache.set(packageName, pkg);
    return pkg;
  } catch (e) {
    logger.error(MISSING_REQUIRED_DEPENDENCY(packageName, context));
    Logger.flush();
    process.exit(1);
  }
}

/**
 * Synchronously loads a CJS package using `createRequire` and caches it.
 * This is meant for optional dependencies that are CJS-only and must
 * be loaded in synchronous contexts (e.g. constructors).
 */
export function loadPackageSync(
  packageName: string,
  context: string,
  loaderFn?: () => any,
): any {
  const cached = packageCache.get(packageName);
  if (cached) {
    return cached;
  }
  try {
    const pkg = loaderFn
      ? loaderFn()
      : createRequire(import.meta.url)(packageName);
    packageCache.set(packageName, pkg);
    return pkg;
  } catch (e) {
    logger.error(MISSING_REQUIRED_DEPENDENCY(packageName, context));
    Logger.flush();
    process.exit(1);
  }
}

/**
 * Synchronously returns a package that was previously loaded and cached
 * via {@link loadPackage}. Throws if the package has not been loaded yet.
 *
 * Use this in methods that must remain synchronous (e.g. `connectMicroservice`).
 * Ensure that `loadPackage()` has been `await`ed for the same package name
 * before calling this function (typically during `init()` or `compile()`).
 */
export function loadPackageCached(packageName: string): any {
  const cached = packageCache.get(packageName);
  if (!cached) {
    throw new Error(
      `Package "${packageName}" has not been loaded yet. ` +
        `Ensure loadPackage("${packageName}", ...) has been awaited before calling loadPackageCached.`,
    );
  }
  return cached;
}
