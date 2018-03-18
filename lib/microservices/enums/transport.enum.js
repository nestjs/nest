"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Transport;
(function (Transport) {
    Transport[Transport["TCP"] = 0] = "TCP";
    Transport[Transport["REDIS"] = 1] = "REDIS";
    Transport[Transport["NATS"] = 2] = "NATS";
    Transport[Transport["STAN"] = 3] = "STAN";
})(Transport = exports.Transport || (exports.Transport = {}));
