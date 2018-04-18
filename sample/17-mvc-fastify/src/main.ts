import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { FastifyAdapter } from '@nestjs/core/adapters/fastify-adapter';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule, new FastifyAdapter());
  app.useStaticAssets({
    root: join(__dirname, 'public'),
    prefix: '/public/',
  });
  app.setViewEngine({
    engine: {
      handlebars: require('handlebars'),
    },
    templates: join(__dirname, 'views'),
  });
  await app.listen(3000);
}
bootstrap();
