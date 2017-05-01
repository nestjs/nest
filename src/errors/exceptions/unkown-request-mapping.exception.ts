import { RuntimeException } from './runtime.exception';
import { UNKOWN_REQUEST_MAPPING } from '../messages';

export class UnkownRequestMappingException extends RuntimeException {
    constructor() {
        super(UNKOWN_REQUEST_MAPPING);
    }
}