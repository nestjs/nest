import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Module({
    components: [EventsGateway],
})
export class EventsModule {}