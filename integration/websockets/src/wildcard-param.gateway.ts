import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { WsParam } from '@nestjs/websockets';

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
