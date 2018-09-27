import { Module, APP_INIT } from '@nest/core';

import { FirstService } from './first.service';
import { SecondService } from './second.service';

import { THIRD_SERVICE } from './tokens';

// @TODO: Lazy injecting needs to work for all providing methods
@Module({
  providers: [
    FirstService,
    SecondService,
    {
      provide: THIRD_SERVICE,
      useValue: 'test',
    },
    {
      provide: 'INVALID_TOKEN',
      useValue: 'lol',
    },
    {
      provide: APP_INIT,
      useFactory: (first: FirstService) => console.log(first),
      // forwardRef(() => FirstService)
      deps: [FirstService],
      multi: true,
    },
  ],
})
export class AppModule {}
