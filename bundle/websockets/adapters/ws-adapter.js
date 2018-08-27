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
const common_1 = require("@nestjs/common");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const core_1 = require("@nestjs/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const constants_1 = require("../constants");
let wsPackage = {};
class WsAdapter {
    constructor(appOrHttpServer) {
        this.logger = new common_1.Logger(WsAdapter.name);
        wsPackage = load_package_util_1.loadPackage('ws', 'WsAdapter');
        if (appOrHttpServer && appOrHttpServer instanceof core_1.NestApplication) {
            this.httpServer = appOrHttpServer.getHttpServer();
        }
        else {
            this.httpServer = appOrHttpServer;
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
    bindMessageHandlers(client, handlers, transform) {
        const close$ = rxjs_1.fromEvent(client, 'close').pipe(operators_1.share(), operators_1.first());
        const source$ = rxjs_1.fromEvent(client, 'message').pipe(operators_1.mergeMap(data => this.bindMessageHandler(data, handlers, transform).pipe(operators_1.filter(result => result))), operators_1.takeUntil(close$));
        source$.subscribe(response => client.send(JSON.stringify(response)));
    }
    bindMessageHandler(buffer, handlers, transform) {
        try {
            const message = JSON.parse(buffer.data);
            const messageHandler = handlers.find(handler => handler.message === message.event);
            const { callback } = messageHandler;
            return transform(callback(message.data));
        }
        catch (_a) {
            return rxjs_1.EMPTY;
        }
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
