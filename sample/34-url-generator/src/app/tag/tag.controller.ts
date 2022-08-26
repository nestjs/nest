import { Controller, Get } from '@nestjs/common';
import { UrlGenerator } from '@nestjs/core';
import { ApiDiscoveryService } from 'src/app/global/api-discovery.service';

@Controller('tags')
export class TagController {
  constructor(
    private apiDiscovery: ApiDiscoveryService,
    private urlGenerator: UrlGenerator,
  ) {}

  onModuleInit() {
    this.apiDiscovery.registerUrl(
      'tags_url',
      this.urlGenerator.generateUrlByRouteName('tags', null, null, true),
    );
  }

  @Get('', 'tags')
  async getTags() {
    return 'tags';
  }
}
