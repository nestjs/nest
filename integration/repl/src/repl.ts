import { repl } from '@nestjs/core';
import { LongLivingAppModule } from './long-living-app.module';

async function bootstrap() {
  await repl(LongLivingAppModule);
}
bootstrap();
