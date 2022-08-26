import { Controller, Get, OnModuleInit } from '@nestjs/common';
import { UrlGenerator } from '@nestjs/core';
import { ApiDiscoveryService } from 'src/app/global/api-discovery.service';

@Controller('posts')
export class PostController implements OnModuleInit {
  constructor(
    private apiDiscovery: ApiDiscoveryService,
    private urlGenerator: UrlGenerator,
  ) {}

  onModuleInit() {
    this.apiDiscovery.registerUrl(
      'posts_url',
      this.urlGenerator.generateUrlByRouteName('posts', null, null, true),
    );
  }

  @Get('', 'posts')
  async getPosts() {
    return 'posts';
  }
}
