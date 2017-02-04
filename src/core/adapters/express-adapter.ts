import * as express from "express";

export class ExpressAdapter {

    static create() {
        return express();
    }

    static createRouter(): express.Router {
        return express.Router();
    }
}