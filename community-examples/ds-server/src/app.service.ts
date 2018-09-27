import { Injectable, Inject } from '@nest/core';
import { DEEPSTREAM_SERVER } from '@nest/ds-server';

@Injectable()
export class AppService {
  @Inject(DEEPSTREAM_SERVER)
  private readonly dsServer: any;
}
