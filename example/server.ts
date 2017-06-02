import * as express from 'express';
import * as bodyParser from 'body-parser';
import { NestFactory } from './../src/core';
import { ApplicationModule } from './modules/app.module';
import { Transport } from '../src/microservices/index';
import { ValidatorPipe } from './common/validator.pipe';

const port = 3001;
const server = express();
server.use(bodyParser());

const app = NestFactory.create(ApplicationModule, server);
const microservice = app.connectMicroservice({
    transport: Transport.TCP,
});

app.useGlobalPipes(new ValidatorPipe());
app.startAllMicroservices(() => console.log('All microservices are listening...'));
app.listen(port, () => {
    console.log('Application listen on port:', port);
    app.close();
});