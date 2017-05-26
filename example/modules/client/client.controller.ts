import { Controller } from '../../../src/common/utils/decorators/controller.decorator';
import { Client } from '../../../src/microservices/utils/client.decorator';
import { Get } from '../../../src/common/utils/decorators/request-mapping.decorator';
import { ClientProxy } from '../../../src/microservices/client/client-proxy';
import { Observable } from 'rxjs';
import { Transport } from '../../../src/microservices/enums/transport.enum';
import 'rxjs/add/operator/catch';
import { MessagePattern } from '../../../src/microservices/index';

const MicroserviceClient = { transport: Transport.TCP, port: 5667 };

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
    public add(data, respond) {
        const numbers = data || [];
        respond(null, numbers.reduce((a, b) => a + b));
    }
}