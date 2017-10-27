import { Module } from '@nestjs/core';
import { EventsGateway } from './events.gateway';

@Module({
    components: [EventsGateway],
})
export class EventsModule {}
