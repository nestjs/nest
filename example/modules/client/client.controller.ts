import { Controller } from '../../../src/common/utils/controller.decorator';
import { Client } from '../../../src/microservices/utils/client.decorator';
import { RequestMapping } from '../../../src/common/utils/request-mapping.decorator';
import { ClientProxy } from '../../../src/microservices/client/client-proxy';
import { Observable } from 'rxjs';
import { Transport } from '../../../src/common/enums/transport.enum';
import 'rxjs/add/operator/catch';

@Controller()
export class ClientController {

    @Client({ transport: Transport.TCP, port: 5667 })
    client: ClientProxy;

    @RequestMapping({ path: 'client' })
    sendMessage(req, res) {
        const pattern = { command: 'add' };
        const data = [ 1, 2, 3, 4, 5 ];

        this.client.send(pattern, data)
            .catch((err) => Observable.empty())
            .subscribe((result) => res.status(200).json({ result }));
    }
}