import { WebSocketGateway } from '../../../src/socket/utils/socket-gateway.decorator';
import { SubscribeMessage } from '../../../src/socket/utils/subscribe-message.decorator';
import { Subject } from 'rxjs/Subject';
import { GatewayServer } from '../../../src/socket/utils/gateway-server.decorator';

@WebSocketGateway({ port: 2000 })
export class ChatGateway {
    private msg$ = new Subject<any>();

    @GatewayServer server;

    get msgStream() {
        return this.msg$.asObservable();
    }

    @SubscribeMessage({ value: 'message' })
    onMessage(client, data) {
        this.msg$.next({ client, data });
    }

}
