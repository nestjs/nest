import { Injectable } from '@nest/core';
import { HTTP_SERVER } from '@nest/server';

@Injectable()
export class FakeAdapter {}

export const HTTP_SERVER_PROVIDER = {
  provide: HTTP_SERVER,
  useClass: FakeAdapter,
};