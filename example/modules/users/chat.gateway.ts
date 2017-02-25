import { SocketGateway } from '../../../src/socket/utils/socket-gateway.decorator';
import { SubscribeMessage } from '../../../src/socket/utils/subscribe-message.decorator';
import { Subject } from 'rxjs/Subject';

@SocketGateway()
export class ChatGateway {
    private msg$ = new Subject<any>();

    get msgStream() {
        return this.msg$.asObservable();
    }

    @SubscribeMessage({ value: 'message' })
    onMessage(client, data) {
        this.msg$.next({ client, data });
    }

}