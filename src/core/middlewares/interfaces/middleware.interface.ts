import { Request, Response, NextFunction } from "express";

export interface Middleware {
    resolve: () => (req?: Request, res?: Response, next?: NextFunction) => void;
}