import { Express } from 'express';
export interface Resolver {
  resolve(express: Express): void;
}
