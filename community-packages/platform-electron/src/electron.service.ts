import { Injectable } from '@nest/core';

@Injectable()
export class ElectronService {
  public async start() {
    console.log('ElectronService started');
  }
}
