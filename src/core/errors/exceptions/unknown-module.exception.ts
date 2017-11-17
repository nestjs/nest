import {RuntimeException} from './runtime.exception';

export class UnknownModuleException extends RuntimeException {
  constructor() { super(); }
}