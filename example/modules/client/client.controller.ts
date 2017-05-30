import { Controller } from '../../../src/common/utils/decorators/controller.decorator';
import { Client } from '../../../src/microservices/utils/client.decorator';
import { Get } from '../../../src/common/utils/decorators/request-mapping.decorator';
import { ClientProxy } from '../../../src/microservices/client/client-proxy';
import { Observable } from 'rxjs';
import { Transport } from '../../../src/microservices/enums/transport.enum';
import { MessagePattern } from '../../../src/microservices/index';
import 'rxjs/add/operator/catch';

const MicroserviceClient = { transport: Transport.REDIS };

@Controller()
export class ClientController {
    @Client(MicroserviceClient)
    private client: ClientProxy;

    @Get('client')
    public sendMessage(req, res) {
        const pattern = { command: 'add' };
        const data = [ 1, 2, 3, 4, 5 ];

        this.client.send(pattern, data)
            .catch((err) => Observable.empty())
            .subscribe((result) => res.status(200).json({ result }));
    }

    @MessagePattern({ command: 'add' })
    public add(data): Observable<number> {
        const numbers = data || [];
        return Observable.of(numbers.reduce((a, b) => a + b));
    }
}