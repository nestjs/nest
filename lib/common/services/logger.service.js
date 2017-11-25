"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const clc = require("cli-color");
const nest_environment_enum_1 = require("../enums/nest-environment.enum");
class Logger {
    constructor(context, printTimestamps = false) {
        this.context = context;
        this.printTimestamps = printTimestamps;
        this.yellow = clc.xterm(3);
    }
    static setMode(mode) {
        this.contextEnv = mode;
    }
    log(message) {
        this.printMessage(message, clc.green);
    }
    error(message, trace = '') {
        this.printMessage(message, clc.red);
        this.printStackTrace(trace);
    }
    warn(message) {
        this.printMessage(message, clc.yellow);
    }
    printMessage(message, color) {
        if (Logger.contextEnv === nest_environment_enum_1.NestEnvironment.TEST)
            return;
        process.stdout.write(color(`[Nest] ${process.pid}   - `));
        process.stdout.write(`${new Date(Date.now()).toLocaleString()}   `);
        process.stdout.write(this.yellow(`[${this.context}] `));
        process.stdout.write(color(message));
        this.printTimestamp();
        process.stdout.write(`\n`);
    }
    printTimestamp() {
        const includeTimestamp = Logger.lastTimestamp && this.printTimestamps;
        if (includeTimestamp) {
            process.stdout.write(this.yellow(` +${Date.now() - Logger.lastTimestamp}ms`));
        }
        Logger.lastTimestamp = Date.now();
    }
    printStackTrace(trace) {
        if (Logger.contextEnv === nest_environment_enum_1.NestEnvironment.TEST || !trace)
            return;
        process.stdout.write(trace);
        process.stdout.write(`\n`);
    }
}
Logger.lastTimestamp = null;
Logger.contextEnv = nest_environment_enum_1.NestEnvironment.RUN;
exports.Logger = Logger;
