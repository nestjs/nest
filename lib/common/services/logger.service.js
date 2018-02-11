"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const clc = require("cli-color");
const nest_environment_enum_1 = require("../enums/nest-environment.enum");
class Logger {
    constructor(context, isTimeDiffEnabled = false) {
        this.context = context;
        this.isTimeDiffEnabled = isTimeDiffEnabled;
    }
    log(message) {
        const { logger } = Logger;
        logger.log(message, this.context, this.isTimeDiffEnabled);
    }
    error(message, trace = '') {
        const { logger } = Logger;
        logger.error(message, trace, this.context, this.isTimeDiffEnabled);
    }
    warn(message) {
        const { logger } = Logger;
        logger.warn(message, this.context, this.isTimeDiffEnabled);
    }
    static overrideLogger(logger) {
        this.logger = logger;
    }
    static setMode(mode) {
        this.contextEnv = mode;
    }
    static log(message, context = '', isTimeDiffEnabled = true) {
        this.printMessage(message, clc.green, context, isTimeDiffEnabled);
    }
    static error(message, trace = '', context = '', isTimeDiffEnabled = true) {
        this.printMessage(message, clc.red, context, isTimeDiffEnabled);
        this.printStackTrace(trace);
    }
    static warn(message, context = '', isTimeDiffEnabled = true) {
        this.printMessage(message, clc.yellow, context, isTimeDiffEnabled);
    }
    static printMessage(message, color, context = '', isTimeDiffEnabled) {
        if (Logger.contextEnv === nest_environment_enum_1.NestEnvironment.TEST)
            return;
        process.stdout.write(color(`[Nest] ${process.pid}   - `));
        process.stdout.write(`${new Date(Date.now()).toLocaleString()}   `);
        process.stdout.write(this.yellow(`[${context}] `));
        process.stdout.write(color(message));
        this.printTimestamp(isTimeDiffEnabled);
        process.stdout.write(`\n`);
    }
    static printTimestamp(isTimeDiffEnabled) {
        const includeTimestamp = Logger.prevTimestamp && isTimeDiffEnabled;
        if (includeTimestamp) {
            process.stdout.write(this.yellow(` +${Date.now() - Logger.prevTimestamp}ms`));
        }
        Logger.prevTimestamp = Date.now();
    }
    static printStackTrace(trace) {
        if (this.contextEnv === nest_environment_enum_1.NestEnvironment.TEST || !trace)
            return;
        process.stdout.write(trace);
        process.stdout.write(`\n`);
    }
}
Logger.prevTimestamp = null;
Logger.contextEnv = nest_environment_enum_1.NestEnvironment.RUN;
Logger.logger = Logger;
Logger.yellow = clc.xterm(3);
exports.Logger = Logger;
