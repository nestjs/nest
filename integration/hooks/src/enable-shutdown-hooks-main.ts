import {
  BeforeApplicationShutdown,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
const VALID_SIGNAL_RE = /^SIG[A-Z0-9]+$/;
function validateSignal(sig: string | undefined): string | undefined {
  if (sig === undefined || sig === 'NONE') return sig;
  if (!VALID_SIGNAL_RE.test(sig)) throw new Error(`Invalid signal name: ${sig}`);
  return sig;
}
const SIGNAL = validateSignal(process.argv[2]);
const SIGNAL_TO_LISTEN = validateSignal(process.argv[3]);
const USE_GRACEFUL_EXIT = process.argv[4] === 'graceful';

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

  const shutdownOptions = USE_GRACEFUL_EXIT ? { useProcessExit: true } : {};

  if (SIGNAL_TO_LISTEN && SIGNAL_TO_LISTEN !== 'NONE') {
    app.enableShutdownHooks([SIGNAL_TO_LISTEN], shutdownOptions);
  } else if (SIGNAL_TO_LISTEN !== 'NONE') {
    app.enableShutdownHooks([], shutdownOptions);
  }

  await app.listen(1800);
  process.kill(process.pid, SIGNAL);
}

void bootstrap();
