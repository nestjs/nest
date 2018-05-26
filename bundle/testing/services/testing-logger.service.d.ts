import { Logger } from '@nestjs/common';
export declare class TestingLogger extends Logger {
    constructor();
    log(message: string): void;
    warn(message: string): void;
    error(message: string, trace: string): void;
}
