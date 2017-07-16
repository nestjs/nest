"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
class ExpressAdapter {
    static create() {
        return express();
    }
    static createRouter() {
        return express.Router();
    }
}
exports.ExpressAdapter = ExpressAdapter;
//# sourceMappingURL=express-adapter.js.map