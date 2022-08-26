import { Injectable } from '@nestjs/common';

export interface ApiDiscovery {
  [key: string]: string;
}

@Injectable()
export class ApiDiscoveryService {
  private discovery: ApiDiscovery = {};

  registerUrl(name: string, url: string) {
    this.discovery[name] = url;
  }

  getApiDiscovery(): ApiDiscovery {
    return this.discovery;
  }
}
