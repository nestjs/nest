import { Module } from '@nestjs/common';
import { EventsGateway, EventsGatewayxD} from './events.gateway';

@Module({
    components: [EventsGateway, EventsGatewayxD],
})
export class EventsModule {}