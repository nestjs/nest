import { Response } from 'express';
import { Res, UseGuards } from '../../../src/index';
import { Controller } from '../../../src/common/utils/decorators/controller.decorator';
import { Client } from '../../../src/microservices/utils/client.decorator';
import { Get } from '../../../src/common/utils/decorators/request-mapping.decorator';
import { ClientProxy } from '../../../src/microservices/client/client-proxy';
import { Observable } from 'rxjs';
import { Transport } from '../../../src/microservices/enums/transport.enum';
import { MessagePattern, RpcException } from '../../../src/microservices/index';
import 'rxjs/add/operator/catch';
import { UsePipes } from '@nestjs/common';
import { ValidatorPipe } from '../../common/validator.pipe';
import { RolesGuard } from "../users/roles.guard";

const MicroserviceClient = { transport: Transport.TCP };

@Controller()
export class ClientController {
    @Client(MicroserviceClient)
    private client: ClientProxy;

    @Get('client')
    public sendMessage(@Res() res: Response) {
        const pattern = { command: 'add' };
        const data = [1, 2, 3, 4, 5];

        this.client.send(pattern, data)
            .catch((err) => {
                res.status(200).json({ err });
                return Observable.empty();
            })
            .finally(() => console.log('finally'))
            .subscribe((result) => res.status(200).json({ result }));
    }

    @UsePipes(new ValidatorPipe())
    @UseGuards(RolesGuard)
    @MessagePattern({ command: 'add' })
    public async add(data): Promise<Observable<number>> {
        const numbers = data || [];
        return Observable.of(numbers.reduce((a, b) => a + b));
    }
}