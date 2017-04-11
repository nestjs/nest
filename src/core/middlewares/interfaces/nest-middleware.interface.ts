import { Request, Response, NextFunction } from 'express';

export interface NestMiddleware {
    resolve(...args): (req?: Request, res?: Response, next?: NextFunction) => void;
}