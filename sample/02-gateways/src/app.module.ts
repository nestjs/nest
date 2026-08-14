import { Module } from '@nestjs/common';
import { EventsModule } from './events/events.module.js';

@Module({
  imports: [EventsModule],
})
export class AppModule {}
