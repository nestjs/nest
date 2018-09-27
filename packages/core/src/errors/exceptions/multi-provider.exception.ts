import { RuntimeException } from './runtime.exception';
import { MultiProviderMessage } from '../messages';

export class MultiProviderException extends RuntimeException {
  constructor(name: string) {
    super(MultiProviderMessage(name));
  }
}
