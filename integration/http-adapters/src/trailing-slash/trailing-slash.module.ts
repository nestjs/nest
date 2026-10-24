import {
  Controller,
  Get,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { markMiddleware } from '../adapters.js';

// The catch-all comes first, so that Express (registration order) gives it
// every path, while Fastify and Node pick the most specific route
@Controller('files')
export class FilesController {
  // The legacy form, converted to "{*path}" where supported
  @Get('*')
  catchAll() {
    return 'catch-all';
  }

  @Get('public')
  public() {
    return 'public';
  }

  @Get(':id')
  byId() {
    return 'by id';
  }
}

@Module({ controllers: [FilesController] })
export class TrailingSlashModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(markMiddleware)
      .exclude('files/public')
      .forRoutes(FilesController);
  }
}
