"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const express_adapter_1 = require("./express-adapter");
class ExpressFactory {
    static create() {
        return new express_adapter_1.ExpressAdapter(express());
    }
}
exports.ExpressFactory = ExpressFactory;
