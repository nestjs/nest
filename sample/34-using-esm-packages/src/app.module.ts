import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { superJSONProvider } from './superjson.provider';
import { importEsmPackage } from './import-esm-package';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    superJSONProvider, // One way to load the ESM package is turning it into a custom provider

    AppService,
  ],
})
export class AppModule implements OnModuleInit {
  // This is just to test the 'delay' ESM-only package
  async onModuleInit() {
    // Another way to load the ESM package is using our 'import' function directly when we need to use it
    const delay =
      await importEsmPackage<typeof import('delay').default>('delay');

    console.time('delay');
    await delay(1_000);
    console.timeEnd('delay');
  }
}
