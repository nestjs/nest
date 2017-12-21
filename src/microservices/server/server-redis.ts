import * as redis from 'redis';
import { Server } from './server';
import { NO_PATTERN_MESSAGE } from '../constants';
import { MicroserviceConfiguration } from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy } from './../interfaces';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/empty';
import 'rxjs/add/operator/finally';

const DEFAULT_URL = 'redis://localhost:6379';
const CONNECT_EVENT = 'connect';
const MESSAGE_EVENT = 'message';
const ERROR_EVENT = 'error';

export class ServerRedis extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private sub = null;
  private pub = null;

  constructor(config: MicroserviceConfiguration) {
    super();
    this.url = config.url || DEFAULT_URL;
  }

  public listen(callback: () => void) {
    this.sub = this.createRedisClient();
    this.pub = this.createRedisClient();

    this.handleErrors(this.pub);
    this.handleErrors(this.sub);
    this.start(callback);
  }

  public start(callback?: () => void) {
    this.sub.on(CONNECT_EVENT, () =>
      this.handleConnection(callback, this.sub, this.pub)
    );
  }

  public close() {
    this.pub && this.pub.quit();
    this.sub && this.sub.quit();
  }

  public createRedisClient() {
    return redis.createClient({ url: this.url });
  }

  public handleConnection(callback, sub, pub) {
    sub.on(MESSAGE_EVENT, this.getMessageHandler(pub).bind(this));

    const patterns = Object.keys(this.messageHandlers);
    patterns.forEach(pattern => sub.subscribe(this.getAckQueueName(pattern)));
    callback && callback();
  }

  public getMessageHandler(pub) {
    return async (channel, buffer) =>
      await this.handleMessage(channel, buffer, pub);
  }

  public async handleMessage(channel, buffer, pub) {
    const msg = this.tryParse(buffer);
    const pattern = channel.replace(/_ack$/, '');
    const publish = this.getPublisher(pub, pattern);
    const status = 'error';

    if (!this.messageHandlers[pattern]) {
      publish({ status, error: NO_PATTERN_MESSAGE });
      return;
    }
    const handler = this.messageHandlers[pattern];
    const response$ = this.transformToObservable(
      await handler(msg.data)
    ) as Observable<any>;
    response$ && this.send(response$, publish);
  }

  public getPublisher(pub, pattern) {
    return respond => {
      pub.publish(this.getResQueueName(pattern), JSON.stringify(respond));
    };
  }

  public tryParse(content) {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }

  public getAckQueueName(pattern) {
    return `${pattern}_ack`;
  }

  public getResQueueName(pattern) {
    return `${pattern}_res`;
  }

  public handleErrors(stream) {
    stream.on(ERROR_EVENT, err => this.logger.error(err));
  }
}
