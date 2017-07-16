import * as amqp from 'amqplib';
import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import { Observable } from 'rxjs/Observable';

export class RabbitMQServer extends Server implements CustomTransportStrategy {
    private server = null;
    private channel = null;

    constructor(
        private readonly host: string,
        private readonly queue: string) {
            super();
        }

    public async listen(callback: () => void) {
        await this.init();
        this.channel.consume(`${this.queue}_sub`, await this.handleMessage.bind(this), { noAck: true });
    }

    public close() {
        this.channel && this.channel.close();
        this.server && this.server.close();
    }

    private async handleMessage(message) {
        const { content } = message;
        const msg = JSON.parse(content.toString());

        const handlers = this.getHandlers();
        const pattern = JSON.stringify(msg.pattern);
        if (!this.messageHandlers[pattern]) {
            return;
        }

        const handler = this.messageHandlers[pattern];
        const response$ = await handler(msg.data) as Observable<any>;
        response$ && this.send(response$, (data) => this.sendMessage(data));
    }

    private sendMessage(message) {
        this.channel.sendToQueue(`${this.queue}_pub`, Buffer.from(JSON.stringify(message)));
    }

    private async init() {
        this.server = await amqp.connect(this.host);
        this.channel = await this.server.createChannel();
        this.channel.assertQueue(`${this.queue}_sub`, { durable: false });
        this.channel.assertQueue(`${this.queue}_pub`, { durable: false });
    }
}