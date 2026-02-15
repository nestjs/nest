import { Module } from '@nestjs/common';
import { AppService } from './app.service.js';
import { MyDynamicModule } from './my-dynamic.module.js';

export const dynamicModule = MyDynamicModule.register('foobar');

@Module({
  imports: [dynamicModule],
  providers: [AppService],
})
export class AppModule {}
