import { WebSocketGateway } from '../../../src/websockets/utils/socket-gateway.decorator';
import { SubscribeMessage } from '../../../src/websockets/utils/subscribe-message.decorator';
import { WebSocketServer } from '../../../src/websockets/utils/gateway-server.decorator';
import { OnGatewayInit, OnGatewayConnection } from '../../../src/websockets/index';
import { ChatMiddleware } from './chat.middleware';

@WebSocketGateway(2000)
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
    @WebSocketServer() private server;

    public afterInit(server) {}
    public handleConnection(client) {}

    @SubscribeMessage('event')
    public onMessage(client, data) {
        client.emit('event', data);
    }
}
