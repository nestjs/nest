"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nest_environment_enum_1 = require("../enums/nest-environment.enum");
const clc = require("cli-color");
class Logger {
    constructor(context) {
        this.context = context;
        this.yellow = clc.xterm(3);
    }
    static setMode(mode) {
        this.mode = mode;
    }
    log(message) {
        this.logMessage(message, clc.green);
    }
    error(message, trace = '') {
        this.logMessage(message, clc.red);
        this.printStackTrace(trace);
    }
    warn(message) {
        this.logMessage(message, clc.yellow);
    }
    logMessage(message, color) {
        if (Logger.mode === nest_environment_enum_1.NestEnvironment.TEST)
            return;
        process.stdout.write(color(`[Nest] ${process.pid}   - `));
        process.stdout.write(`${new Date(Date.now()).toLocaleString()}   `);
        process.stdout.write(this.yellow(`[${this.context}] `));
        process.stdout.write(color(message));
        process.stdout.write(`\n`);
    }
    printStackTrace(trace) {
        if (Logger.mode === nest_environment_enum_1.NestEnvironment.TEST)
            return;
        process.stdout.write(trace);
        process.stdout.write(`\n`);
    }
}
Logger.mode = nest_environment_enum_1.NestEnvironment.RUN;
exports.Logger = Logger;
//# sourceMappingURL=logger.service.js.map