import { Module } from '@nestjs/common';
import { HelloModule } from './hello/hello.module.js';

@Module({
  imports: [HelloModule.forRoot({ provide: 'META', useValue: true })],
})
export class ApplicationModule {}
