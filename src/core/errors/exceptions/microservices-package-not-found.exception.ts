import {MICROSERVICES_PACKAGE_NOT_FOUND_EXCEPTION} from '../messages';

import {RuntimeException} from './runtime.exception';

export class MicroservicesPackageNotFoundException extends RuntimeException {
  constructor() { super(MICROSERVICES_PACKAGE_NOT_FOUND_EXCEPTION); }
}