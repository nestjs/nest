import * as net from 'net';
import * as JsonSocket from 'json-socket';
import { Server as NetSocket } from 'net';
import { NO_PATTERN_MESSAGE, CLOSE_EVENT } from '../constants';
import { Server } from './server';
import { CustomTransportStrategy } from './../interfaces';
import { Observable } from 'rxjs/Observable';
import { catchError } from 'rxjs/operators';
import { empty } from 'rxjs/observable/empty';
import { finalize } from 'rxjs/operators';
import { TCP_DEFAULT_PORT, MESSAGE_EVENT, ERROR_EVENT } from './../constants';
import { MicroserviceConfiguration } from '../interfaces/microservice-configuration.interface';

export class ServerTCP extends Server implements CustomTransportStrategy {
  private readonly port: number;
  private server: NetSocket;
  private isExplicitlyTerminated = false;
  private retryAttemptsCount = 0;

  constructor(private readonly config: MicroserviceConfiguration) {
    super();
    this.port = config.port || TCP_DEFAULT_PORT;
    this.init();
  }

  public listen(callback: () => void) {
    this.server.listen(this.port, callback);
  }

  public close() {
    this.isExplicitlyTerminated = true;
    this.server.close();
  }

  public bindHandler(socket) {
    const sock = this.getSocketInstance(socket);
    sock.on(MESSAGE_EVENT, async msg => await this.handleMessage(sock, msg));
  }

  public async handleMessage(socket, msg: { pattern: any; data: {} }) {
    const pattern = JSON.stringify(msg.pattern);
    const status = 'error';
    if (!this.messageHandlers[pattern]) {
      socket.sendMessage({ status, error: NO_PATTERN_MESSAGE });
      return;
    }
    const handler = this.messageHandlers[pattern];
    const response$ = this.transformToObservable(
      await handler(msg.data),
    ) as Observable<any>;
    response$ && this.send(response$, socket.sendMessage.bind(socket));
  }

  public handleClose(): undefined | NodeJS.Timer {
    if (
      this.isExplicitlyTerminated ||
      !this.config.retryAttempts ||
      this.retryAttemptsCount >= this.config.retryAttempts
    ) {
      return undefined;
    }
    ++this.retryAttemptsCount;
    return setTimeout(
      () => this.server.listen(this.port),
      this.config.retryDelay || 0,
    );
  }

  private init() {
    this.server = net.createServer(this.bindHandler.bind(this));
    this.server.on(ERROR_EVENT, this.handleError.bind(this));
    this.server.on(CLOSE_EVENT, this.handleClose.bind(this));
  }

  private getSocketInstance(socket) {
    return new JsonSocket(socket);
  }
}
