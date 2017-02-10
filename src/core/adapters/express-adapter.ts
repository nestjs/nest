import * as express from "express";

export class ExpressAdapter {

    static create(): any {
        return express();
    }

    static createRouter(): any {
        return express.Router();
    }
}