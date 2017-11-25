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
const client_proxy_1 = require("./client-proxy");
const common_1 = require("@nestjs/common");
const DEFAULT_PORT = 3000;
const DEFAULT_HOST = 'localhost';
const CONNECT_EVENT = 'connect';
const MESSAGE_EVENT = 'message';
const ERROR_EVENT = 'error';
const CLOSE_EVENT = 'close';
class ClientTCP extends client_proxy_1.ClientProxy {
    constructor({ port, host }) {
        super();
        this.logger = new common_1.Logger(ClientTCP.name);
        this.isConnected = false;
        this.port = port || DEFAULT_PORT;
        this.host = host || DEFAULT_HOST;
    }
    init() {
        this.socket = this.createSocket();
        return new Promise((resolve) => {
            this.socket.on(CONNECT_EVENT, () => {
                this.isConnected = true;
                this.bindEvents(this.socket);
                resolve(this.socket);
            });
            this.socket.connect(this.port, this.host);
        });
    }
    sendSingleMessage(msg, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const sendMessage = (socket) => {
                socket.sendMessage(msg);
                socket.on(MESSAGE_EVENT, (buffer) => this.handleResponse(socket, callback, buffer));
            };
            if (this.isConnected) {
                sendMessage(this.socket);
                return Promise.resolve();
            }
            const socket = yield this.init();
            sendMessage(socket);
        });
    }
    handleResponse(socket, callback, buffer) {
        const { err, response, disposed } = buffer;
        if (disposed) {
            callback(null, null, true);
            socket.end();
            return;
        }
        callback(err, response);
    }
    createSocket() {
        return new JsonSocket(new net.Socket());
    }
    close() {
        if (this.socket) {
            this.socket.end();
            this.isConnected = false;
            this.socket = null;
        }
    }
    bindEvents(socket) {
        socket.on(ERROR_EVENT, (err) => this.logger.error(err));
        socket.on(CLOSE_EVENT, () => {
            this.isConnected = false;
            this.socket = null;
        });
    }
}
exports.ClientTCP = ClientTCP;
