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
const constants_1 = require("./../constants");
class ClientTCP extends client_proxy_1.ClientProxy {
    constructor({ port, host }) {
        super();
        this.logger = new common_1.Logger(ClientTCP.name);
        this.isConnected = false;
        this.port = port || constants_1.TCP_DEFAULT_PORT;
        this.host = host || constants_1.TCP_DEFAULT_HOST;
    }
    init(callback) {
        this.socket = this.createSocket();
        return new Promise(resolve => {
            this.bindEvents(this.socket, callback);
            this.socket._socket.once(constants_1.CONNECT_EVENT, () => {
                this.isConnected = true;
                resolve(this.socket);
            });
            this.socket.connect(this.port, this.host);
        });
    }
    sendMessage(msg, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const self = this;
            const processMessage = (socket) => {
                socket.sendMessage(msg);
                socket.on(constants_1.MESSAGE_EVENT, function (buffer) {
                    self.handleResponse(socket, callback, buffer, this);
                });
            };
            if (this.isConnected) {
                processMessage(this.socket);
                return Promise.resolve();
            }
            const socket = yield this.init(callback);
            processMessage(socket);
        });
    }
    handleResponse(socket, callback, buffer, context) {
        const { err, response, disposed } = buffer;
<<<<<<< HEAD
        if (disposed) {
            callback(null, null, true);
            return socket._socket.removeListener(constants_1.MESSAGE_EVENT, context);
=======
        if (disposed || err) {
            callback(err, null, true);
            return socket.end();
>>>>>>> master
        }
        callback(err, response);
    }
    createSocket() {
        return new JsonSocket(new net.Socket());
    }
    close() {
        this.socket && this.socket.end();
        this.handleClose();
    }
    bindEvents(socket, callback) {
        socket.on(constants_1.ERROR_EVENT, err => this.handleError(err, callback));
        socket.on(constants_1.CLOSE_EVENT, () => this.handleClose());
    }
    handleError(err, callback) {
        if (err.code === 'ECONNREFUSED') {
            callback(err, null);
        }
        this.logger.error(err);
    }
    handleClose() {
        this.isConnected = false;
        this.socket = null;
    }
}
exports.ClientTCP = ClientTCP;
