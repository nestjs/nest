import {
  BeforeApplicationShutdown,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
const SIGNAL = process.argv[2];
const SIGNAL_TO_LISTEN = process.argv[3];

@Injectable()
class TestInjectable
  implements OnApplicationShutdown, BeforeApplicationShutdown
{
  beforeApplicationShutdown(signal: string) {
    console.log('beforeApplicationShutdown ' + signal);
  }

  onApplicationShutdown(signal: string) {
    console.log('onApplicationShutdown ' + signal);
  }
}

@Module({
  providers: [TestInjectable],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });

  if (SIGNAL_TO_LISTEN && SIGNAL_TO_LISTEN !== 'NONE') {
    app.enableShutdownHooks([SIGNAL_TO_LISTEN]);
  } else if (SIGNAL_TO_LISTEN !== 'NONE') {
    app.enableShutdownHooks();
  }

  await app.listen(1800);
  process.kill(process.pid, SIGNAL);
}

void bootstrap();
