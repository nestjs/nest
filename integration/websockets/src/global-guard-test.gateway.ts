import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@Injectable()
export class TestGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    return false;
  }
}

@WebSocketGateway(8080)
export class GlobalGuardTestGateway {
  public handledMessage = false;

  @SubscribeMessage('test-msg')
  handleTest(client, data) {
    this.handledMessage = true;
  }
}
