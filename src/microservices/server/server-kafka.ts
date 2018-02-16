import { Client, Consumer } from 'kafka-node';
import { Server, CustomTransportStrategy, MicroserviceConfiguration } from '@nestjs/microservices';

const DEFAULT_HOST = 'localhost:2181';
const MESSAGE_EVENT = 'message';
const ERROR_EVENT = 'error';

export class ServerKafka extends Server implements CustomTransportStrategy {
    private readonly host: string;
    private consumer: Consumer;
    private topics: object[];

    constructor(config: MicroserviceConfiguration) {
        super();
        this.host = config.host || DEFAULT_HOST;
    }

    public listen(callback: () => void) {
        this.start(callback);
    }

    public start(callback?: () => void) {
        this.topics = Object.keys(this.getHandlers())
            .map(pattern => JSON.parse(pattern))
            .filter(pattern => pattern.topic);

        this.consumer = new Consumer(new Client(this.host), this.topics, { autoCommit: false });
        this.consumer.on(MESSAGE_EVENT, this.handleMessageEvent.bind(this));
        this.consumer.on(ERROR_EVENT, this.handleErrorEvent.bind(this));

        callback();
    }

    public close() {
        this.consumer.close(() => {});
    }

    private async handleMessageEvent(message) {
        const pattern: string = JSON.stringify({topic: message.topic});
        const handler: any = this.messageHandlers[pattern];
        await handler(JSON.parse(message.value));
        this.consumer.commit(message, () => {});
    }

    private handleErrorEvent(err) {
        this.logger.error(err);
    }
}
