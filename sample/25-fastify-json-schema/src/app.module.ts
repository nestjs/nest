import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { HttpErrorFilter } from './common/filters/http-exception.filter';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpErrorFilter,
    },
  ],
})
export class ApplicationModule {}
