import { RuntimeException } from './runtime.exception';

export class UnknownModuleException extends RuntimeException {
  constructor(moduleName?: string) {
    super(
      `Nest could not select the given module (${
        moduleName ? `"${moduleName}"` : 'it'
      } does not exist in current context).`,
    );
  }
}
