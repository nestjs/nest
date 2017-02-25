import { Request, Response, NextFunction } from 'express';

export interface NestMiddleware {
    resolve: () => (req?: Request, res?: Response, next?: NextFunction) => void;
}