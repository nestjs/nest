import { Injectable, Inject } from '@nest/core';
import { DEEPSTREAM_CLIENT, DsClient } from '@nest/ds-client';

@Injectable()
export class AppService {
  @Inject(DEEPSTREAM_CLIENT)
  private readonly dsClient: DsClient;
}
