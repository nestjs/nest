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
    constructor(options) {
        super();
        this.options = options;
        this.isExplicitlyTerminated = false;
        this.retryAttemptsCount = 0;
        this.port =
            this.getOptionsProp(options, 'port') || constants_2.TCP_DEFAULT_PORT;
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
        const readSocket = this.getSocketInstance(socket);
        readSocket.on(constants_2.MESSAGE_EVENT, (msg) => __awaiter(this, void 0, void 0, function* () { return yield this.handleMessage(readSocket, msg); }));
    }
    handleMessage(socket, packet) {
        return __awaiter(this, void 0, void 0, function* () {
            const pattern = JSON.stringify(packet.pattern);
            const status = 'error';
            if (!this.messageHandlers[pattern]) {
                return socket.sendMessage({
                    id: packet.id,
                    status,
                    err: constants_1.NO_PATTERN_MESSAGE,
                });
            }
            const handler = this.messageHandlers[pattern];
            const response$ = this.transformToObservable(yield handler(packet.data));
            response$ &&
                this.send(response$, data => socket.sendMessage(Object.assign(data, { id: packet.id })));
        });
    }
    handleClose() {
        if (this.isExplicitlyTerminated ||
            !this.getOptionsProp(this.options, 'retryAttempts') ||
            this.retryAttemptsCount >=
                this.getOptionsProp(this.options, 'retryAttempts')) {
            return undefined;
        }
        ++this.retryAttemptsCount;
        return setTimeout(() => this.server.listen(this.port), this.getOptionsProp(this.options, 'retryDelay') || 0);
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
