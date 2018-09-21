import { INVALID_MODULE_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class InvalidModuleException extends RuntimeException {
  constructor(trace: any[]) {
    const scope = (trace || []).map(module => module.name).join(' -> ');
    super(INVALID_MODULE_MESSAGE`${scope}`);
  }
}
