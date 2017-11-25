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
require("rxjs/add/operator/catch");
require("rxjs/add/observable/empty");
require("rxjs/add/operator/finally");
const DEFAULT_PORT = 3000;
const MESSAGE_EVENT = 'message';
const ERROR_EVENT = 'error';
class ServerTCP extends server_1.Server {
    constructor(config) {
        super();
        this.port = config.port || DEFAULT_PORT;
        this.init();
    }
    listen(callback) {
        this.server.listen(this.port, callback);
    }
    close() {
        this.server.close();
    }
    bindHandler(socket) {
        const sock = this.getSocketInstance(socket);
        sock.on(MESSAGE_EVENT, (msg) => __awaiter(this, void 0, void 0, function* () { return yield this.handleMessage(sock, msg); }));
    }
    handleMessage(socket, msg) {
        return __awaiter(this, void 0, void 0, function* () {
            const pattern = JSON.stringify(msg.pattern);
            const status = 'error';
            if (!this.messageHandlers[pattern]) {
                socket.sendMessage({ status, error: constants_1.NO_PATTERN_MESSAGE });
                return;
            }
            const handler = this.messageHandlers[pattern];
            const response$ = this.transformToObservable(yield handler(msg.data));
            response$ && this.send(response$, socket.sendMessage.bind(socket));
        });
    }
    init() {
        this.server = net.createServer(this.bindHandler.bind(this));
        this.server.on(ERROR_EVENT, this.handleError.bind(this));
    }
    getSocketInstance(socket) {
        return new JsonSocket(socket);
    }
}
exports.ServerTCP = ServerTCP;
