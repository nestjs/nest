import { NestFactory } from '@nestjs/core';
import { AppModule, dynamicModule } from './app.module';
import { AppService } from './app.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const appService = app.get(AppService);
  console.log('AppService#getHello:', appService.getHello());

  // Note that below we can't use `app.select(MyDynamicModule)` otherwise we would get an error as the static version of `MyDynamicModule` was not imported anywhere
  const myDynamicProviderValue = app
    .select(dynamicModule)
    .get('MyDynamicProvider');
  console.log('MyDynamicProvider:', myDynamicProviderValue);

  return app.close();
}
bootstrap();
