import { InvalidModuleConfigMessage } from './constants';

export class InvalidModuleConfigException extends Error {
    constructor(property: string) {
        super(InvalidModuleConfigMessage(property));
    }
}