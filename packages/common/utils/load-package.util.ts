import { Logger } from '../services/logger.service';

const MISSING_REQUIRED_DEPENDENCY = (name: string, reason: string) =>
  `The "${name}" package is missing. Please, make sure to install it to take advantage of ${reason}.`;

const logger = new Logger('PackageLoader');

export function loadPackage(
  packageName: string,
  context: string,
  loaderFn?: Function,
) {
  try {
    return loaderFn ? loaderFn() : require(packageName);
  } catch (e) {
    logger.error(MISSING_REQUIRED_DEPENDENCY(packageName, context));
    Logger.flush();
    process.exit(1);
  }
}
