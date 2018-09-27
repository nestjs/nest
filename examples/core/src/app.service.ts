import { Injectable, Injector } from '@nest/core';

import { NestService } from './nest';

@Injectable()
export class AppService {
  constructor(
    // private readonly nest: NestService,
    // @TODO: Fix hierarchy export of modules and providers
    private readonly nest: NestService,
  ) {}

  public start() {
    console.log(this.nest);
  }
}
