import { NextFunction, Request, Response } from 'express';
// tslint:disable-next-line:callable-types
export type ExpressMiddleware = (req?: Request & any, res?: Response & any, next?: NextFunction) => void;
