import { Controller, Get, Module, Param } from '@nestjs/common';

// Two versions of one route name their parameter differently: both routes
// match "/users/<id>", and each handler must see only its own parameter.

@Controller({ path: 'users', version: '1' })
export class UsersV1Controller {
  @Get(':id')
  find(@Param() params: Record<string, string>) {
    return params;
  }
}

@Controller({ path: 'users', version: '2' })
export class UsersV2Controller {
  @Get(':userId')
  find(@Param() params: Record<string, string>) {
    return params;
  }
}

@Controller({ path: 'reports', version: '1' })
export class ReportsV1Controller {
  @Get(':name.:ext')
  find(@Param() params: Record<string, string>) {
    const response: Record<string, string> = { version: '1', ...params };
    return response;
  }
}

@Controller({ path: 'reports', version: '2' })
export class ReportsV2Controller {
  @Get(':name{.:locale}.:ext')
  find(@Param() params: Record<string, string>) {
    const response: Record<string, string> = { version: '2', ...params };
    return response;
  }
}

@Module({
  controllers: [
    UsersV1Controller,
    UsersV2Controller,
    ReportsV1Controller,
    ReportsV2Controller,
  ],
})
export class RouteParamsModule {}
