import { RuntimeException } from "./runtime.exception";

export class UnkownExportException extends RuntimeException {

    constructor() {
        super(`You are trying to export unkown component. Maybe ` +
              `you forgot to place this one to components list also.`);
    }

}