import { bootstrap } from '@nest/core';

import { AppModule } from './app.module';

bootstrap(AppModule).catch(console.error);
