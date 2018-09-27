import { APP_INIT, Module, MODULE_INIT } from '@nest/core';

import { NestModule } from './nest';
import { AppService } from './app.service';
import { MoreNestService } from './nest/more-nest';

@Module({
  imports: [NestModule.forRoot()],
  providers: [
    AppService,
    {
      provide: APP_INIT,
      useFactory: (app: AppService) => app.start(),
      deps: [AppService],
      multi: true,
    },
    {
      provide: MODULE_INIT,
      useFactory: (moreNest: MoreNestService) => moreNest.hello(),
      deps: [MoreNestService],
      multi: true,
    },
  ],
})
export class AppModule {}
