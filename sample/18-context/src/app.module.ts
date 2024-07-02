import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { MyDynamicModule } from './my-dynamic.module';

export const dynamicModule = MyDynamicModule.register('foobar');

@Module({
  imports: [dynamicModule],
  providers: [AppService],
})
export class AppModule {}
