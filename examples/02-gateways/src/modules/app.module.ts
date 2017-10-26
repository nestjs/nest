import { EventsModule } from './events/events.module';
import { Module } from '';

@Module({
    modules: [EventsModule],
})
export class ApplicationModule {}
