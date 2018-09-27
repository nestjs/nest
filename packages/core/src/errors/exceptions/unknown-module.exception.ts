import { RuntimeException } from './runtime.exception';

export class UnknownModuleException extends RuntimeException {
  constructor(trace: any[] = []) {
    const scope = trace.map(module => module.name).join(' -> ');
    super(
      `Nest cannot select given module (it does not exist in current context). Scope [${scope}]`,
    );
  }
}
