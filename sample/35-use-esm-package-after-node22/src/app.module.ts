import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { superJSONProvider } from './superjson.provider';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    superJSONProvider, // One way to load the ESM package is turning it into a custom provider

    AppService,
  ],
})
export class AppModule {}
