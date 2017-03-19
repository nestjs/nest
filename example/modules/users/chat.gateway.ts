import { WebSocketGateway } from '../../../src/websockets/utils/socket-gateway.decorator';
import { SubscribeMessage } from '../../../src/websockets/utils/subscribe-message.decorator';
import { Subject } from 'rxjs/Subject';
import { WebSocketServer } from '../../../src/websockets/utils/gateway-server.decorator';

@WebSocketGateway({ port: 2000 })
export class ChatGateway {
    private msg$ = new Subject<any>();

    @WebSocketServer() server;

    get msgStream() {
        return this.msg$.asObservable();
    }

    @SubscribeMessage({ value: 'message' })
    onMessage(client, data) {
        this.msg$.next({ client, data });
    }

}
