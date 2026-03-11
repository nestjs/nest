import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function generateTypes() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    abortOnError: false,
    logger: false,
  });
  await app.close();
}

void generateTypes().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
