import { Inject, Injectable } from '@nest/core';

import { IPFS_CLIENT } from './symbols';

@Injectable()
export class IpfsService {
  /*@Inject(IPFS_CLIENT)
  private readonly ipfs: any;*/

  public async start(): Promise<any> {
    /*return new Promise(resolve => {
      this.ipfs.on('ready', () => {
        resolve(this.ipfs);
      });
    });*/
  }

  public async close() {
    //await this.ipfs.close();
  }
}
