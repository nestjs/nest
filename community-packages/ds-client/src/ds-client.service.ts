import { Inject, Injectable } from '@nest/core';

import { DsClient } from './ds-client.interface';
import { DEEPSTREAM_CLIENT } from './tokens';

@Injectable()
export class DsClientService {
  @Inject(DEEPSTREAM_CLIENT)
  private readonly client!: DsClient;

  public async login(authParams?: any) {
    return new Promise((resolve, reject) => {
      this.client.login(authParams, (success, data) => {
        if (success) {
          resolve(data);
        } else {
          reject(data);
        }
      });
    });
  }
}
