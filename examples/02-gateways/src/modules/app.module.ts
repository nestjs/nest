import { Module } from '@nestjs/core';
import { EventsModule } from './events/events.module';

@Module({
    modules: [EventsModule],
})
export class ApplicationModule {}
