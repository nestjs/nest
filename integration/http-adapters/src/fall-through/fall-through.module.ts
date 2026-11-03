import {
  All,
  Controller,
  Get,
  Module,
  Param,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';

// Each controller has a literal route for version 2 and a less specific
// ":id" route for other versions: a request for "/<prefix>/me" in another
// version skips the literal route and falls through to ":id".

@Controller('items')
export class VersionedController {
  @Get('me')
  @Version('2')
  me() {
    return 'me v2';
  }

  @Get(':id')
  @Version('1')
  byId(@Param('id') id: string) {
    return `id v1 ${id}`;
  }
}

@Controller('neutral')
export class NeutralController {
  @Get('me')
  @Version('2')
  me() {
    return 'me v2';
  }

  @Get(':id')
  @Version(VERSION_NEUTRAL)
  byId(@Param('id') id: string) {
    return `id neutral ${id}`;
  }
}

@Controller('many')
export class ManyVersionsController {
  @Get('me')
  @Version('2')
  me() {
    return 'me v2';
  }

  @Get(':id')
  @Version(['1', '3'])
  byId(@Param('id') id: string) {
    return `id v1|v3 ${id}`;
  }
}

@Controller('any')
export class AllMethodsController {
  @Get('me')
  @Version('2')
  me() {
    return 'me v2';
  }

  @All(':id')
  @Version('1')
  byId(@Param('id') id: string) {
    return `all v1 ${id}`;
  }
}

@Module({
  controllers: [
    VersionedController,
    NeutralController,
    ManyVersionsController,
    AllMethodsController,
  ],
})
export class FallThroughModule {}

@Controller({ path: 'tenants', host: ':tenant.example.com' })
export class TenantController {
  @Get('me')
  me() {
    return 'tenant me';
  }
}

@Controller('tenants')
export class AnyHostController {
  @Get(':id')
  byId(@Param('id') id: string) {
    return `any host ${id}`;
  }
}

@Module({ controllers: [TenantController, AnyHostController] })
export class HostFallThroughModule {}
