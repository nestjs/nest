"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const JsonSocket = require("json-socket");
const net = require("net");
const operators_1 = require("rxjs/operators");
const constants_1 = require("./../constants");
const client_proxy_1 = require("./client-proxy");
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
        if (this.isConnected) {
            return Promise.resolve();
        }
        this.socket = this.createSocket();
        return new Promise((resolve, reject) => {
            this.bindEvents(this.socket);
            this.connect$(this.socket._socket)
                .pipe(operators_1.tap(() => (this.isConnected = true)))
                .subscribe(resolve, reject);
            this.socket.connect(this.port, this.host);
        });
    }
    handleResponse(callback, buffer) {
        const { err, response, isDisposed } = buffer;
        if (isDisposed || err) {
            callback({
                err,
                response: null,
                isDisposed: true,
            });
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
    publish(partialPacket, callback) {
        try {
            const packet = this.assignPacketId(partialPacket);
            const listener = (buffer) => {
                if (buffer.id !== packet.id) {
                    return undefined;
                }
                this.handleResponse(callback, buffer);
            };
            this.socket.on(constants_1.MESSAGE_EVENT, listener);
            this.socket.sendMessage(packet);
            return () => this.socket._socket.removeListener(constants_1.MESSAGE_EVENT, listener);
        }
        catch (err) {
            callback({ err });
        }
    }
}
exports.ClientTCP = ClientTCP;
