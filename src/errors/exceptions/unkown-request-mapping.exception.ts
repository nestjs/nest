import { RuntimeException } from "./runtime.exception";

export class UnkownRequestMappingException extends RuntimeException {

    constructor() {
        super(`RequestMapping not defined in @RequestMapping() annotation!`);
    }

}