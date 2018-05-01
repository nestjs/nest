import { Logger } from '../services/logger.service';

const MissingRequiredDependency = (name: string, reason: string) =>
  `The "${name}" package is missing. Please, make sure to install this library ($ npm install ${name}) to take advantage of ${reason}.`;

const logger = new Logger('PackageLoader');

export function loadPackage(packageName: string, context: string) {
  try {
    return require(packageName);
  } catch (e) {
    logger.error(MissingRequiredDependency(packageName, context));
    process.exit(1);
  }
}
