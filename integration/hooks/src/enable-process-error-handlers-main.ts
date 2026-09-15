import {
  BeforeApplicationShutdown,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

// Which fatal event to trigger, and what the handler does with it.
const EVENT = process.argv[2]; // 'uncaughtException' | 'unhandledRejection'
const MODE = process.argv[3]; // 'log' | 'shutdown'
const EXIT_CODE = process.argv[4] ? Number(process.argv[4]) : undefined;

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

  app.enableProcessErrorHandlers({
    [EVENT]: (
      error: Error,
      { shutdown }: { shutdown: (opts?: any) => Promise<never> },
    ) => {
      console.log('handler ' + EVENT + ' ' + error.message);
      if (MODE === 'shutdown') {
        return shutdown(EXIT_CODE ? { exitCode: EXIT_CODE } : undefined);
      }
    },
  });

  await app.listen(0);

  if (EVENT === 'uncaughtException') {
    setTimeout(() => {
      throw new Error('boom');
    }, 10);
  } else {
    Promise.reject(new Error('boom'));
  }

  if (MODE === 'log') {
    // Give the handler a moment to run, then prove the process is still
    // alive and serving before exiting on our own.
    setTimeout(() => {
      console.log('still alive');
      process.exit(0);
    }, 100);
  }
}

void bootstrap();
