import {
  ArgumentsHost,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  MiddlewareConsumer,
  Module,
  NestModule,
  Param,
} from '@nestjs/common';
import { markMiddleware } from '../adapters.js';

@Controller('items')
export class ItemsController {
  @Get(':id')
  byId(@Param('id') id: string) {
    return { length: id.length };
  }
}

@Controller('files')
export class FilesController {
  @Get(':id')
  byId(@Param('id') id: string) {
    return { length: id.length };
  }

  @Get('*')
  catchAll() {
    return 'catch-all';
  }
}

@Controller('cats')
export class CatsController {
  @Get()
  list() {
    return 'cats';
  }
}

@Controller('admin')
export class AdminCatchAllController {
  @Get('*')
  catchAll() {
    return 'admin catch-all';
  }
}

@Module({
  controllers: [
    ItemsController,
    FilesController,
    CatsController,
    AdminCatchAllController,
  ],
})
export class NodeSpecificsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(markMiddleware).forRoutes('cats', AdminCatchAllController);
  }
}

/**
 * Catches everything, to show that the 414 goes through Nest's exception
 * handling like any other error.
 */
@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const raw = response.raw ?? response;
    raw.writeHead(error.statusCode ?? error.getStatus?.() ?? 500, {
      'Content-Type': 'application/json',
    });
    raw.end(JSON.stringify({ filtered: true, status: error.statusCode }));
  }
}
