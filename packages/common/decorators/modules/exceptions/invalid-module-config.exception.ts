import { INVALID_MODULE_CONFIG_MESSAGE } from './constants';

export class InvalidModuleConfigException extends Error {
  constructor(property: string) {
    super(INVALID_MODULE_CONFIG_MESSAGE`${property}`);
  }
}
