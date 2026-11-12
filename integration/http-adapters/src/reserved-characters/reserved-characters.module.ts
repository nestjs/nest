import {
  Controller,
  Get,
  MiddlewareConsumer,
  Module,
  NestModule,
  Param,
} from '@nestjs/common';
import { markMiddleware } from '../adapters.js';

// Routes with a reserved character ("@", "=") in the text that follows a
// parameter in its segment, and with a literal "%". The routers of Fastify
// and Node (find-my-way) match such text in the decoded form of the request
// path, so they serve "%40" for "@", and reach a "%" only as "%25".

@Controller('avatars')
export class AvatarsController {
  @Get(':user-avatar@2x.png')
  find(@Param('user') user: string) {
    return { user };
  }
}

@Controller('skus')
export class SkusController {
  @Get(':sku-color=:color')
  find(@Param() params: Record<string, string>) {
    return params;
  }
}

@Controller('discounts')
export class DiscountsController {
  @Get('100%')
  find() {
    return { discount: 100 };
  }
}

@Module({
  controllers: [AvatarsController, SkusController, DiscountsController],
})
export class ReservedCharactersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(markMiddleware)
      .forRoutes(AvatarsController, SkusController, DiscountsController);
  }
}
