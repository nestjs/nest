"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const JsonSocket = require("json-socket");
const client_proxy_1 = require("./client-proxy");
const common_1 = require("@nestjs/common");
const constants_1 = require("./../constants");
const operators_1 = require("rxjs/operators");
const constants_2 = require("./constants");
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
    connect() {
        this.socket = this.createSocket();
        return new Promise((resolve, reject) => {
            this.bindEvents(this.socket);
            this.connect$(this.socket._socket)
                .pipe(operators_1.tap(() => (this.isConnected = true)))
                .subscribe(resolve, reject);
            this.socket.connect(this.port, this.host);
        });
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
    bindEvents(socket) {
        socket.on(constants_1.ERROR_EVENT, err => err.code !== constants_2.ECONNREFUSED && this.handleError(err));
        socket.on(constants_1.CLOSE_EVENT, () => this.handleClose());
    }
    handleError(err) {
        this.logger.error(err);
    }
    handleClose() {
        this.isConnected = false;
        this.socket = null;
    }
    async publish(partialPacket, callback) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
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
            handleRequestResponse(this.socket);
        }
        catch (err) {
            callback({ err });
        }
    }
}
exports.ClientTCP = ClientTCP;
