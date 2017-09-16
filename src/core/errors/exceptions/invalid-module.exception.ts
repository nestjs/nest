import { RuntimeException } from './runtime.exception';
import { InvalidModuleMessage } from '../messages';

export class InvalidModuleException extends RuntimeException {
  constructor(trace: any[]) {
    const scope = (trace || []).map((module) => module.name).join(' -> ');
    super(InvalidModuleMessage(scope));
  }
}