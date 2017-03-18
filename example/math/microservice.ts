import { NestFactory } from '../../src/nest-factory';
import { Transport } from '../../src/common/enums/transport.enum';
import { MicroserviceModule } from './modules/microservice.module';

const app = NestFactory.createMicroservice(
    MicroserviceModule, { transport: Transport.TCP, port: 5667 }
);
app.listen(() => console.log('Microservice listen on port:', 5667 ));
