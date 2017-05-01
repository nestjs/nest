import { Application } from 'express';

export interface Resolver {
    resolve(express: Application);
}