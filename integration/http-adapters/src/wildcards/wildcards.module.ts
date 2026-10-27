import {
  Controller,
  Get,
  MiddlewareConsumer,
  Module,
  NestModule,
  Param,
} from '@nestjs/common';
import { markMiddleware } from '../adapters.js';

@Controller('admin')
export class AdminController {
  @Get()
  index() {
    return 'admin index';
  }

  // The legacy form, converted to "{*path}"
  @Get('*')
  catchAll() {
    return 'admin catch-all';
  }
}

@Controller('named')
export class NamedWildcardController {
  @Get('{*path}')
  catchAll(@Param('path') path: string[] | undefined) {
    return { path: path ?? null };
  }
}

@Controller('optional')
export class OptionalParamController {
  @Get('{:id}')
  byId(@Param('id') id: string | undefined) {
    return { id: id ?? null };
  }
}

@Controller()
export class ShapesController {
  @Get('docs{/}')
  docs() {
    return 'docs';
  }

  @Get('files{.json}')
  files() {
    return 'files';
  }

  @Get('users{/:id}/posts')
  posts(@Param() params: Record<string, string>) {
    return params;
  }

  @Get('wild/*splat')
  splat(@Param('splat') splat: string[]) {
    return splat;
  }
}

@Module({
  controllers: [
    AdminController,
    NamedWildcardController,
    OptionalParamController,
    ShapesController,
  ],
})
export class WildcardsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(markMiddleware)
      .forRoutes(
        AdminController,
        NamedWildcardController,
        OptionalParamController,
      );
  }
}

@Controller()
export class RootCatchAllController {
  @Get('*')
  catchAll() {
    return 'catch-all';
  }
}

@Module({ controllers: [RootCatchAllController] })
export class RootCatchAllModule {}
