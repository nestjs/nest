import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/empty';
import 'rxjs/add/operator/finally';

import * as JsonSocket from 'json-socket';
import * as net from 'net';
import {Server as NetSocket} from 'net';
import {Observable} from 'rxjs/Observable';

import {NO_PATTERN_MESSAGE} from '../constants';

import {CustomTransportStrategy} from './../interfaces';
import {Server} from './server';

const DEFAULT_PORT = 3000;
const MESSAGE_EVENT = 'message';
const ERROR_EVENT = 'error';

export class ServerTCP extends Server implements CustomTransportStrategy {
  private readonly port: number;
  private server: NetSocket;

  constructor(config) {
    super();
    this.port = config.port || DEFAULT_PORT;
    this.init();
  }

  public listen(callback: () => void) {
    this.server.listen(this.port, callback);
  }

  public close() { this.server.close(); }

  public bindHandler(socket) {
    const sock = this.getSocketInstance(socket);
    sock.on(MESSAGE_EVENT, async msg => await this.handleMessage(sock, msg));
  }

  public async handleMessage(socket, msg: {pattern: any, data: {}}) {
    const pattern = JSON.stringify(msg.pattern);
    const status = 'error';
    if (!this.messageHandlers[pattern]) {
      socket.sendMessage({status, error : NO_PATTERN_MESSAGE});
      return;
    }

    const handler = this.messageHandlers[pattern];
    const response$ =
        this.transformToObservable(await handler(msg.data)) as Observable<any>;
    response$ && this.send(response$, socket.sendMessage.bind(socket));
  }

  private init() {
    this.server = net.createServer(this.bindHandler.bind(this));
    this.server.on(ERROR_EVENT, this.handleError.bind(this));
  }

  private getSocketInstance(socket) { return new JsonSocket(socket); }
}