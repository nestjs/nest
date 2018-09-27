import { RuntimeException } from './runtime.exception';
import { MissingInjectionTokenMessage } from '../messages';

export class MissingInjectionTokenException extends RuntimeException {
  constructor(context: string) {
    super(MissingInjectionTokenMessage(context));
  }
}
