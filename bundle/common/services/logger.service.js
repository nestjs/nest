"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const clc = require("cli-color");
const decorators_1 = require("../decorators");
const nest_environment_enum_1 = require("../enums/nest-environment.enum");
const shared_utils_1 = require("../utils/shared.utils");
let Logger = Logger_1 = class Logger {
    constructor(context, isTimeDiffEnabled = false) {
        this.context = context;
        this.isTimeDiffEnabled = isTimeDiffEnabled;
    }
    log(message, context) {
        const { logger } = Logger_1;
        if (logger === this) {
            Logger_1.log(message, context || this.context, this.isTimeDiffEnabled);
            return;
        }
        logger &&
            logger.log.call(logger, message, context || this.context, this.isTimeDiffEnabled);
    }
    error(message, trace = '', context) {
        const { logger } = Logger_1;
        if (logger === this) {
            Logger_1.error(message, trace, context || this.context, this.isTimeDiffEnabled);
            return;
        }
        logger &&
            logger.error.call(logger, message, trace, context || this.context, this.isTimeDiffEnabled);
    }
    warn(message, context) {
        const { logger } = Logger_1;
        if (logger === this) {
            Logger_1.warn(message, context || this.context, this.isTimeDiffEnabled);
            return;
        }
        logger &&
            logger.warn.call(logger, message, context || this.context, this.isTimeDiffEnabled);
    }
    static overrideLogger(logger) {
        this.logger = logger ? logger : null;
    }
    static setMode(mode) {
        this.contextEnvironment = mode;
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
        if (Logger_1.contextEnvironment === nest_environment_enum_1.NestEnvironment.TEST) {
            return void 0;
        }
        const output = message && shared_utils_1.isObject(message) ? JSON.stringify(message, null, 2) : message;
        process.stdout.write(color(`[Nest] ${process.pid}   - `));
        process.stdout.write(`${new Date(Date.now()).toLocaleString()}   `);
        context && process.stdout.write(this.yellow(`[${context}] `));
        process.stdout.write(color(output));
        this.printTimestamp(isTimeDiffEnabled);
        process.stdout.write(`\n`);
    }
    static printTimestamp(isTimeDiffEnabled) {
        const includeTimestamp = Logger_1.prevTimestamp && isTimeDiffEnabled;
        if (includeTimestamp) {
            process.stdout.write(this.yellow(` +${Date.now() - Logger_1.prevTimestamp}ms`));
        }
        Logger_1.prevTimestamp = Date.now();
    }
    static printStackTrace(trace) {
        if (this.contextEnvironment === nest_environment_enum_1.NestEnvironment.TEST || !trace) {
            return void 0;
        }
        process.stdout.write(trace);
        process.stdout.write(`\n`);
    }
};
Logger.prevTimestamp = null;
Logger.contextEnvironment = nest_environment_enum_1.NestEnvironment.RUN;
Logger.logger = Logger_1;
Logger.yellow = clc.xterm(3);
Logger = Logger_1 = __decorate([
    decorators_1.Injectable(),
    __param(0, decorators_1.Optional()),
    __param(1, decorators_1.Optional()),
    __metadata("design:paramtypes", [String, Object])
], Logger);
exports.Logger = Logger;
var Logger_1;
