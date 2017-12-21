import {NestFactory} from '@nestjs/core';
import {ApplicationModule} from './modules/app.module';

(async () => {
  const app = await NestFactory.create(ApplicationModule);
  await app.listen(3000);
})();
