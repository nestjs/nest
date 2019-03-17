import { Injectable, OnApplicationShutdown, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
const SIGNAL = process.argv[2];
const SIGNAL_TO_LISTEN = process.argv[3];

@Injectable()
class TestInjectable implements OnApplicationShutdown {
  onApplicationShutdown(signal: string) {
    console.log('Signal ' + signal);
  }
}

@Module({
  providers: [TestInjectable],
})
class AppModule { }

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: true });

  if (SIGNAL_TO_LISTEN && SIGNAL_TO_LISTEN !== 'NONE') {
    app.enableShutdownHooks([SIGNAL_TO_LISTEN]);
  } else if (SIGNAL_TO_LISTEN !== 'NONE') {
    app.enableShutdownHooks();
  }

  await app.listen(1800);
  process.kill(process.pid, SIGNAL);
}

bootstrap();
