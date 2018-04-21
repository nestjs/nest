"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ExecutionContextHost {
    constructor(args, constructorRef = null, handler = null) {
        this.args = args;
        this.constructorRef = constructorRef;
        this.handler = handler;
    }
    getClass() {
        return this.constructorRef;
    }
    getHandler() {
        return this.handler;
    }
    getArgs() {
        return this.args;
    }
    getArgByIndex(index) {
        return this.args[index];
    }
    switchToRpc() {
        return Object.assign(this, {
            getData: () => this.getArgByIndex(0),
        });
    }
    switchToHttp() {
        return Object.assign(this, {
            getRequest: () => this.getArgByIndex(0),
            getResponse: () => this.getArgByIndex(1),
        });
    }
    switchToWs() {
        return Object.assign(this, {
            getClient: () => this.getArgByIndex(0),
            getData: () => this.getArgByIndex(1),
        });
    }
}
exports.ExecutionContextHost = ExecutionContextHost;
