import { Middleware } from "./middleware.interface";

export interface MiddlewareProto {
    new(): Middleware;
}