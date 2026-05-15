import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { REQUEST_CONTEXT_ID } from '@nestjs/core/router/request/request-constants.js';

type TrackableSocket = {
  emit: Function;
  id?: string;
  listeners?(event: string): Function[];
};

function getListenerCount(client: TrackableSocket, event: string) {
  return client.listeners?.(event).length ?? 0;
}

@Injectable()
export class SocketLifecycleTracker {
  private latestDisconnectState:
    | {
        stateListeners: number;
        disconnectListeners: number;
        hasRequestContextId: boolean;
      }
    | undefined;

  public reset() {
    this.latestDisconnectState = undefined;
  }

  public recordDisconnect(client: TrackableSocket) {
    this.latestDisconnectState = {
      stateListeners: getListenerCount(client, 'state'),
      disconnectListeners: getListenerCount(client, 'disconnect'),
      hasRequestContextId: REQUEST_CONTEXT_ID in client,
    };
  }

  public getDisconnectState() {
    return this.latestDisconnectState;
  }
}

@Injectable({ scope: Scope.REQUEST })
export class ConnectionStateService {
  private static nextId = 0;

  private readonly instanceId = ++ConnectionStateService.nextId;
  private sequence = 0;

  constructor(@Inject(REQUEST) private readonly client: { id?: string }) {}

  public snapshot(client: { id?: string }, source: 'connection' | 'message') {
    return {
      instanceId: this.instanceId,
      sequence: ++this.sequence,
      source,
      injectedClientId: this.client.id,
      connectedClientId: client.id,
      matchesClient: this.client === client,
    };
  }
}

@WebSocketGateway()
export class RequestScopeGateway {
  constructor(
    private readonly connectionState: ConnectionStateService,
    private readonly socketLifecycleTracker: SocketLifecycleTracker,
  ) {}

  handleConnection(@ConnectedSocket() client: TrackableSocket) {
    client.emit(
      'connectedState',
      this.connectionState.snapshot(client, 'connection'),
    );
  }

  async handleDisconnect(@ConnectedSocket() client: TrackableSocket) {
    await new Promise(resolve => setImmediate(resolve));
    this.socketLifecycleTracker.recordDisconnect(client);
  }

  @SubscribeMessage('state')
  onState(@ConnectedSocket() client: TrackableSocket) {
    return {
      event: 'state',
      data: this.connectionState.snapshot(client, 'message'),
    };
  }
}
