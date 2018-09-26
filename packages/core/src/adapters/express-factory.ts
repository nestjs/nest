import * as express from 'express';
import { ExpressAdapter } from './express-adapter';

export class ExpressFactory {
  public static create(): any {
    return new ExpressAdapter(express());
  }
}
