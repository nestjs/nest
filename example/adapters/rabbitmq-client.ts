import * as amqp from 'amqplib';
import { ClientProxy } from '../../src/microservices/index';

export class RabbitMQClient extends ClientProxy {
    constructor(
        private readonly host: string,
        private readonly queue: string) {
            super();
        }

    protected async sendSingleMessage(msg, callback: (err, result, disposed?: boolean) => void) {
        const server = await amqp.connect(this.host);
        const channel = await server.createChannel();
        const sub = this.getSubscriberQueue();
        const pub = this.getPublisherQueue();

        channel.assertQueue(sub, { durable: false });
        channel.assertQueue(pub, { durable: false });

        channel.consume(pub, (message) => this.handleMessage(message, server, callback), { noAck: true });
        channel.sendToQueue(sub, Buffer.from(JSON.stringify(msg)));
    }

    private handleMessage(message, server, callback: (err, result, disposed?: boolean) => void) {
        const { content } = message;
        const { err, response, disposed } = JSON.parse(content.toString());
        if (disposed) {
            server.close();
        }
        callback(err, response, disposed);
    }

    private getPublisherQueue(): string {
        return `${this.queue}_pub`;
    }

    private getSubscriberQueue(): string {
        return `${this.queue}_sub`;
    }
}