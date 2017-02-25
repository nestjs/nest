import { Application } from 'express';

export interface NestApplicationFactory {
    new (app: Application);
    name?: string;
}