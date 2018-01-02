import { RuntimeException } from './runtime.exception';
import { MICROSERVICES_PACKAGE_NOT_FOUND_EXCEPTION } from '../messages';

export class MicroservicesPackageNotFoundException extends RuntimeException {
  constructor() {
    super(MICROSERVICES_PACKAGE_NOT_FOUND_EXCEPTION);
  }
}
