"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const JsonSocket = require("json-socket");
const constants_1 = require("../constants");
const server_1 = require("./server");
const constants_2 = require("./../constants");
class ServerTCP extends server_1.Server {
    constructor(config) {
        super();
        this.config = config;
        this.isExplicitlyTerminated = false;
        this.retryAttemptsCount = 0;
        this.port = config.port || constants_2.TCP_DEFAULT_PORT;
        this.init();
    }
    listen(callback) {
        this.server.listen(this.port, callback);
    }
    close() {
        this.isExplicitlyTerminated = true;
        this.server.close();
    }
    bindHandler(socket) {
        const sock = this.getSocketInstance(socket);
        sock.on(constants_2.MESSAGE_EVENT, (msg) => __awaiter(this, void 0, void 0, function* () { return yield this.handleMessage(sock, msg); }));
    }
    handleMessage(socket, msg) {
        return __awaiter(this, void 0, void 0, function* () {
            const pattern = JSON.stringify(msg.pattern);
            const status = 'error';
            if (!this.messageHandlers[pattern]) {
                return socket.sendMessage({ status, err: constants_1.NO_PATTERN_MESSAGE });
            }
            const handler = this.messageHandlers[pattern];
            const response$ = this.transformToObservable(yield handler(msg.data));
            response$ && this.send(response$, socket.sendMessage.bind(socket));
        });
    }
    handleClose() {
        if (this.isExplicitlyTerminated ||
            !this.config.retryAttempts ||
            this.retryAttemptsCount >= this.config.retryAttempts) {
            return undefined;
        }
        ++this.retryAttemptsCount;
        return setTimeout(() => this.server.listen(this.port), this.config.retryDelay || 0);
    }
    init() {
        this.server = net.createServer(this.bindHandler.bind(this));
        this.server.on(constants_2.ERROR_EVENT, this.handleError.bind(this));
        this.server.on(constants_1.CLOSE_EVENT, this.handleClose.bind(this));
    }
    getSocketInstance(socket) {
        return new JsonSocket(socket);
    }
}
exports.ServerTCP = ServerTCP;
