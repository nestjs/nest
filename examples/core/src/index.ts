import 'reflect-metadata';
import { bootstrap } from '@nest/core';

import { AppModule } from './app.module';

bootstrap(AppModule).catch(err => console.error(err));
