import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './modules/app.module';

const app = NestFactory.create(ApplicationModule);
app.listen(3000, () => console.log('Nest application is listening...'));
