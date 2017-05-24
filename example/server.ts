import * as io from 'socket.io';
import { NestFactory } from './../src/core';
import { ApplicationModule } from './modules/app.module';
import { Transport } from '../src/microservices/index';

const port = 3001;
const app = NestFactory.create(ApplicationModule);
const microservice = app.connectMicroservice({
    transport: Transport.TCP,
    port: 5667,
});
app.setIoAdapter({
    create(p: number) {
        return io(p);
    },
    createWithNamespace(p: number, namespace: string) {
        return io(p);
    },
});
app.startAllMicroservices(() => console.log('All microservices are listening...'));
app.listen(port, () => {
    console.log('Application listen on port:', port);
    app.close();
});