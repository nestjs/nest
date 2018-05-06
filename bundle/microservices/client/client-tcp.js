"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const JsonSocket = require("json-socket");
const client_proxy_1 = require("./client-proxy");
const common_1 = require("@nestjs/common");
const constants_1 = require("./../constants");
class ClientTCP extends client_proxy_1.ClientProxy {
    constructor(options) {
        super();
        this.logger = new common_1.Logger(ClientTCP.name);
        this.isConnected = false;
        this.port =
            this.getOptionsProp(options, 'port') ||
                constants_1.TCP_DEFAULT_PORT;
        this.host =
            this.getOptionsProp(options, 'host') ||
                constants_1.TCP_DEFAULT_HOST;
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
    async publish(partialPacket, callback) {
        const handleRequestResponse = (jsonSocket) => {
            const packet = this.assignPacketId(partialPacket);
            jsonSocket.sendMessage(packet);
            const listener = (buffer) => {
                if (buffer.id !== packet.id) {
                    return undefined;
                }
                this.handleResponse(jsonSocket, callback, buffer, listener);
            };
            jsonSocket.on(constants_1.MESSAGE_EVENT, listener);
        };
        if (this.isConnected) {
            return handleRequestResponse(this.socket);
        }
        const socket = await this.init(callback);
        handleRequestResponse(socket);
        return;
    }
    handleResponse(socket, callback, buffer, context) {
        const { err, response, isDisposed } = buffer;
        if (isDisposed || err) {
            callback({
                err,
                response: null,
                isDisposed: true,
            });
            return socket._socket.removeListener(constants_1.MESSAGE_EVENT, context);
        }
        callback({
            err,
            response,
        });
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
