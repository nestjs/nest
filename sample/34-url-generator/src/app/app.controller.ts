import { Controller, Get } from '@nestjs/common';
import { UrlGenerator } from '@nestjs/core';
import { ApiDiscoveryService } from 'src/app/global/api-discovery.service';

@Controller()
export class AppController {
  constructor(private readonly apiDiscovery: ApiDiscoveryService) {}

  @Get()
  getApiDiscovery(): { [key: string]: string } {
    // return api discovery
    return this.apiDiscovery.getApiDiscovery();
  }
}
