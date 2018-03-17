import * as stan from 'node-nats-streaming';
import { Server } from './server';
import { NO_PATTERN_MESSAGE, MESSAGE_EVENT, STAN_DEFAULT_URL } from '../constants';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy, PacketId } from './../interfaces';
import { Observable } from 'rxjs/Observable';
import { catchError } from 'rxjs/operators';
import { empty } from 'rxjs/observable/empty';
import { finalize } from 'rxjs/operators';
import { NATS_DEFAULT_URL, CONNECT_EVENT, ERROR_EVENT } from './../constants';
import { ReadPacket } from './../interfaces/packet.interface';

export class ServerStan extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private consumer: stan.Stan;
  private publisher: stan.Stan;

  constructor(private readonly options: MicroserviceOptions) {
    super();
    this.url = options.url || STAN_DEFAULT_URL;
  }

  public async listen(callback: () => void) {
    this.consumer = await this.createStanClient('consumer');
    this.publisher = await this.createStanClient('producer');
  
    this.start(callback);
  }

  public start(callback?: () => void) {
    this.bindEvents(this.consumer, this.publisher);
    callback();
  }

  public bindEvents(consumer: stan.Stan, publisher: stan.Stan) {
    const registeredPatterns = Object.keys(this.messageHandlers);
    registeredPatterns.forEach(pattern => {
      const channel = this.getAckQueueName(pattern);

      // TODO: Add opts
      const subscription = consumer.subscribe(channel, 'default');
      subscription.on(
        MESSAGE_EVENT,
        () => this.getMessageHandler(channel, publisher),
      );
    });
  }

  public close() {
    this.publisher && this.publisher.close();
    this.consumer && this.consumer.close();
    this.publisher = this.consumer = null;
  }

  public createStanClient(clientId: string): Promise<stan.Stan> {
    const client = stan.connect('clusterId', clientId, {
      url: this.url,
    });
    this.handleError(client);
    return new Promise(resolve =>
      client.on(CONNECT_EVENT, () => resolve(client)),
    );
  }

  public getMessageHandler(channel: string, pubClient: stan.Stan) {
    return async buffer => await this.handleMessage(channel, buffer, pubClient);
  }

  public async handleMessage(
    channel: string,
    message: ReadPacket & PacketId,
    pub: stan.Stan,
  ) {
    const pattern = channel.replace(/_ack$/, '');
    const publish = this.getPublisher(pub, pattern, message.id);
    const status = 'error';

    if (!this.messageHandlers[pattern]) {
      return publish({ id: message.id, status, err: NO_PATTERN_MESSAGE });
    }
    const handler = this.messageHandlers[pattern];
    const response$ = this.transformToObservable(
      await handler(message.data),
    ) as Observable<any>;
    response$ && this.send(response$, publish);
  }

  public getPublisher(publisher: stan.Stan, pattern: any, id: string) {
    return response =>
      publisher.publish(this.getResQueueName(pattern, id), Object.assign(
        response,
        { id },
      ) as any);
  }

  public getAckQueueName(pattern: string): string {
    return `${pattern}_ack`;
  }

  public getResQueueName(pattern: string, id: string): string {
    return `${pattern}_${id}_res`;
  }

  public handleError(stream) {
    stream.on(ERROR_EVENT, err => this.logger.error(err));
  }
}
