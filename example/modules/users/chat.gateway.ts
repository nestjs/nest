import { SocketGateway } from '../../../src/socket/utils/socket-gateway.decorator';
import { SubscribeMessage } from '../../../src/socket/utils/subscribe-message.decorator';
import { Subject } from 'rxjs/Subject';
import { GatewayServer } from '../../../src/socket/utils/gateway-server.decorator';

@SocketGateway()
export class ChatGateway {
    private msg$ = new Subject<any>();

    @GatewayServer
    server;

    get msgStream() {
        return this.msg$.asObservable();
    }

    @SubscribeMessage({ value: 'message' })
    onMessage(client, data) {
        this.msg$.next({ client, data });
    }

}