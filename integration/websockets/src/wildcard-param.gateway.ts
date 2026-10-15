import { ParseIntPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WsParam,
} from '@nestjs/websockets';

export const WILDCARD_SEPARATE_PORT = 18091;

@WebSocketGateway({
  path: '/chat/:roomId/socket',
})
export class WildcardParamGateway {
  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: any,
    @MessageBody() data: any,
    @WsParam('roomId') roomId: string,
  ) {
    return {
      event: 'joined',
      data: {
        roomId,
        message: data.message,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @SubscribeMessage('getAllParams')
  handleGetAllParams(
    @ConnectedSocket() client: any,
    @MessageBody() data: any,
    @WsParam() params: Record<string, string>,
  ) {
    return {
      event: 'allParams',
      data: {
        params,
        receivedData: data,
      },
    };
  }
}

@WebSocketGateway({
  path: '/game/:gameId/room/:roomId/player/:playerId/socket',
})
export class MultipleParamsGateway {
  @SubscribeMessage('move')
  handleMove(
    @ConnectedSocket() client: any,
    @MessageBody() moveData: any,
    @WsParam('gameId') gameId: string,
    @WsParam('roomId') roomId: string,
    @WsParam('playerId') playerId: string,
  ) {
    return {
      event: 'moveProcessed',
      data: {
        gameId,
        roomId,
        playerId,
        move: moveData,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @SubscribeMessage('status')
  handleStatus(
    @ConnectedSocket() client: any,
    @WsParam() allParams: Record<string, string>,
  ) {
    return {
      event: 'statusUpdate',
      data: {
        ...allParams,
        status: 'active',
      },
    };
  }
}

@WebSocketGateway({ path: '/files/:id/meta' })
export class SpecificFilesGateway implements OnGatewayConnection {
  handleConnection(client: any, req: any) {
    client.send(
      JSON.stringify({
        event: 'connected',
        data: { gateway: 'specific', params: req.params },
      }),
    );
  }
}

@WebSocketGateway({ path: '/files/*path' })
export class WildcardFilesGateway implements OnGatewayConnection {
  handleConnection(client: any, req: any) {
    client.send(
      JSON.stringify({
        event: 'connected',
        data: { gateway: 'wildcard', params: req.params },
      }),
    );
  }
}

@WebSocketGateway({ path: '/files/health' })
export class StaticFilesGateway implements OnGatewayConnection {
  handleConnection(client: any, req: any) {
    client.send(
      JSON.stringify({
        event: 'connected',
        data: { gateway: 'static', params: req.params },
      }),
    );
  }
}

@WebSocketGateway({ path: '/connected/:id' })
export class ConnectionParamsGateway implements OnGatewayConnection {
  handleConnection(client: any, req: any) {
    client.send(
      JSON.stringify({
        event: 'connected',
        data: { params: req.params },
      }),
    );
  }
}

@WebSocketGateway({ path: '/parse/:id' })
export class ParseIntParamGateway {
  @SubscribeMessage('echo')
  echo(@WsParam('id', ParseIntPipe) id: number) {
    return {
      event: 'echo',
      data: { id, type: typeof id },
    };
  }
}

@WebSocketGateway(WILDCARD_SEPARATE_PORT, { path: '/dyn/:id' })
export class SeparatePortParamGateway {
  @SubscribeMessage('echo')
  echo(@WsParam('id') id: string) {
    return {
      event: 'echo',
      data: { id },
    };
  }
}
