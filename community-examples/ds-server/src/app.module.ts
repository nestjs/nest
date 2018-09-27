import { APP_INIT, Module } from '@nest/core';
import { DsServerModule } from '@nest/ds-server';

import { AppService } from './app.service';

@Module({
  imports: [DsServerModule.forRoot()],
  providers: [
    AppService,
    {
      provide: APP_INIT,
      useFactory: (app: AppService) => console.log(app),
      deps: [AppService],
      multi: true,
    },
  ],
})
export class AppModule {}
