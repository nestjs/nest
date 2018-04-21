import 'reflect-metadata';
import { NestGateway } from './interfaces/nest-gateway.interface';
import { ObservableSocketServer } from './interfaces/observable-socket-server.interface';
import { MessageMappingProperties } from './gateway-metadata-explorer';
import { Subject } from 'rxjs/Subject';
import { SocketServerProvider } from './socket-server-provider';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { NestContainer } from '@nestjs/core/injector/container';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { WsContextCreator } from './context/ws-context-creator';
import { Observable } from 'rxjs/Observable';
export declare class WebSocketsController {
  private readonly socketServerProvider;
  private readonly container;
  private readonly config;
  private readonly contextCreator;
  private readonly metadataExplorer;
  private readonly middlewaresInjector;
  constructor(
    socketServerProvider: SocketServerProvider,
    container: NestContainer,
    config: ApplicationConfig,
    contextCreator: WsContextCreator,
  );
  hookGatewayIntoServer(
    instance: NestGateway,
    metatype: Type<any>,
    module: string,
  ): void;
  subscribeObservableServer(
    instance: NestGateway,
    options: any,
    port: number,
    module: string,
  ): void;
  injectMiddlewares(
    {
      server,
    }: {
      server: any;
    },
    instance: NestGateway,
    module: string,
  ): void;
  subscribeEvents(
    instance: NestGateway,
    messageHandlers: MessageMappingProperties[],
    observableServer: ObservableSocketServer,
  ): void;
  getConnectionHandler(
    context: WebSocketsController,
    instance: NestGateway,
    messageHandlers: MessageMappingProperties[],
    disconnect: Subject<any>,
    connection: Subject<any>,
  ): (client: any) => void;
  subscribeInitEvent(instance: NestGateway, event: Subject<any>): void;
  subscribeConnectionEvent(instance: NestGateway, event: Subject<any>): void;
  subscribeDisconnectEvent(instance: NestGateway, event: Subject<any>): void;
  subscribeMessages(
    messageHandlers: MessageMappingProperties[],
    client: any,
    instance: NestGateway,
  ): void;
  pickResult(defferedResult: Promise<any>): Promise<Observable<any>>;
  private hookServerToProperties(instance, server);
}
