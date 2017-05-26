import { NestFactory } from '../../src/core/nest-factory';
import { Transport } from '../../src/microservices/enums/transport.enum';
import { MicroserviceModule } from './modules/microservice.module';

const app = NestFactory.createMicroservice(
    MicroserviceModule,
    {
        transport: Transport.REDIS,
        url: 'redis://localhost:6379',
    },
);
app.listen(() => console.log('Microservice listen on port:', 5667 ));
