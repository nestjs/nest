import { Transport } from '../enums';
import { CustomTransportStrategy } from '../interfaces';
import { MemphisOptions } from '../interfaces/microservice-configuration.interface';
import { Server } from './server';

type Memphis = any;

let memphisPackage: any = {};

export class ServerMemphis extends Server implements CustomTransportStrategy {
  public readonly transportId = Transport.MEMPHIS;

  private connection: Memphis;

  constructor(private readonly options: MemphisOptions['options']) {
    super();

    memphisPackage = this.loadPackage('memphis-dev', ServerMemphis.name, () =>
      require('memphis-dev')
    );

    this.initializeSerializer(options);
    this.initializeDeserializer(options);
  }

  public async listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => Promise<void>
  ) {
    try {
      this.connection = await memphisPackage.connect(this.options);
      this.createConsumers();
    } catch (err) {
      console.log(err);
      this.close();
    } finally {
      callback();
    }
  }

  public async close(): Promise<void> {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }

  private async createConsumers(): Promise<void> {
    const channels = [...this.messageHandlers.keys()];

    channels.forEach(async (option) => {
      const handler = this.messageHandlers.get(option);
      const consumer = await this.connection.consumer(JSON.parse(option));
      this.bindEventHandlers(consumer, handler);
    });
    //await Promise.all(channels.map((channel) => this.subscriber.listenTo(channel)));
  }

  private bindEventHandlers(consumer: any, handler: any): void {
    consumer.on('message', (message) => {
      handler(message);
    });

    consumer.on('error', (error) => {
      handler(error);
    });
  }
}
