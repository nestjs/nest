import { Controller, Param, Get, OnModuleInit } from '@nestjs/common';
import { UrlGenerator } from '@nestjs/core';
import { ApiDiscoveryService } from 'src/app/global/api-discovery.service';

@Controller('users')
export class UserController implements OnModuleInit {
  constructor(
    private apiDiscovery: ApiDiscoveryService,
    private urlGenerator: UrlGenerator,
  ) {}

  onModuleInit() {
    this.apiDiscovery.registerUrl(
      'users_url',
      this.urlGenerator.generateUrlByRouteName('users', null, null, true),
    );
  }

  @Get('', 'users')
  async getUsers() {
    return 'users';
  }

  @Get(':uuid', 'userByUuid')
  async getUser(@Param('uuid') uuid: string) {
    return {
      url: this.urlGenerator.generateUrlByRouteName(
        'userByUuid',
        { uuid: uuid },
        { sort: 'asc' },
      ),
      urlAbsolute: this.urlGenerator.generateUrlByRouteName(
        'userByUuid',
        { uuid: uuid },
        { sort: 'asc' },
        true,
      ),
    };
  }
}
