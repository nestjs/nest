import { MiddlewareConsumer, Module, Scope } from '@nestjs/common';
import { AsyncContext } from '@nestjs/core/hooks/async-context';
import { CatsController } from './cats.controller';
import { CatsService, Rawr } from './cats.service';

export class Boom {
  boom() {
    return 'bum';
  }
}
@Module({
  controllers: [CatsController],
  providers: [
    CatsService,
    Rawr,
    {
      provide: Boom,
      useFactory: () => {
        console.log('Boom has been created (lazy)');
        return new Boom();
      },
      scope: Scope.LAZY,
    },
  ],
})
export class CatsModule {
  constructor(private readonly asyncContext: AsyncContext) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => this.asyncContext.run(next))
      .forRoutes('*');
  }
}
