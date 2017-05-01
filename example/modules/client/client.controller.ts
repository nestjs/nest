import { Controller } from '../../../src/common/utils/decorators/controller.decorator';
import { Client } from '../../../src/microservices/utils/client.decorator';
import { RequestMapping } from '../../../src/common/utils/decorators/request-mapping.decorator';
import { ClientProxy } from '../../../src/microservices/client/client-proxy';
import { Observable } from 'rxjs';
import { Transport } from '../../../src/common/enums/transport.enum';
import 'rxjs/add/operator/catch';

const MicroserviceClient = { transport: Transport.TCP, port: 5667 };

@Controller()
export class ClientController {
    @Client(MicroserviceClient)
    public client: ClientProxy;

    @RequestMapping({ path: 'client' })
    public sendMessage(req, res) {
        const pattern = { command: 'add' };
        const data = [ 1, 2, 3, 4, 5 ];

        this.client.send(pattern, data)
            .catch((err) => Observable.empty())
            .subscribe((result) => res.status(200).json({ result }));
    }
}