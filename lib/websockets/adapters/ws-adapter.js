"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const fromEvent_1 = require("rxjs/observable/fromEvent");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const empty_1 = require("rxjs/observable/empty");
const missing_dependency_exception_1 = require("@nestjs/core/errors/exceptions/missing-dependency.exception");
let wsPackage = {};
class WsAdapter {
    constructor(httpServer = null) {
        this.httpServer = httpServer;
        this.logger = new common_1.Logger(WsAdapter.name);
        try {
            wsPackage = require('ws');
        }
        catch (e) {
            throw new missing_dependency_exception_1.MissingRequiredDependencyException('ws', 'WsAdapter');
        }
    }
    create(port, options) {
        const { server } = options, wsOptions = __rest(options, ["server"]);
        if (port === 0 && this.httpServer) {
            return this.bindErrorHandler(new wsPackage.Server(Object.assign({ server: this.httpServer }, wsOptions)));
        }
        return server
            ? server
            : this.bindErrorHandler(new wsPackage.Server(Object.assign({ port }, wsOptions)));
    }
    bindClientConnect(server, callback) {
        server.on(constants_1.CONNECTION_EVENT, callback);
    }
    bindClientDisconnect(client, callback) {
        client.on(constants_1.CLOSE_EVENT, callback);
    }
    bindMessageHandlers(client, handlers, process) {
        fromEvent_1.fromEvent(client, 'message')
            .pipe(operators_1.mergeMap(data => this.bindMessageHandler(data, handlers, process)), operators_1.filter(result => !!result))
            .subscribe(response => client.send(JSON.stringify(response)));
    }
    bindMessageHandler(buffer, handlers, process) {
        const message = JSON.parse(buffer.data);
        const messageHandler = handlers.find(handler => handler.message === message.event);
        if (!messageHandler) {
            return empty_1.empty();
        }
        const { callback } = messageHandler;
        return process(callback(message.data));
    }
    close(server) {
        shared_utils_1.isFunction(server.close) && server.close();
    }
    bindErrorHandler(server) {
        server.on(constants_1.ERROR_EVENT, err => this.logger.error(err));
        return server;
    }
}
exports.WsAdapter = WsAdapter;
