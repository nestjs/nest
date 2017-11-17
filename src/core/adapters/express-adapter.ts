import * as express from 'express';

export class ExpressAdapter {
    public static create(): any {
        return express();
    }

    public static createRouter(): any {
        return express.Router();
    }
}