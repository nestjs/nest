import { ServerNats } from '@nestjs/microservices';

export interface NatsSubscriber {
  key: string;
  value: {
    pattern: string;
    queue: string;
  };
}

export class NatsStrategy extends ServerNats {
  bindEvents(client) {
    const handlers = Object.keys(this.messageHandlers).map(item => ({
      key: item,
      value: JSON.parse(item),
    })) as NatsSubscriber[];

    handlers.forEach(({ key, value }) =>
      client.subscribe(
        value.pattern,
        value.queue,
        this.getMessageHandler(key, client).bind(this),
      ),
    );
  }
}
