import * as express from 'express';
import * as bodyParser from 'body-parser';
import { NestFactory } from './../src/core';
import { ApplicationModule } from './modules/app.module';
import { Transport } from '../src/microservices/index';
import { ServerRedis } from '@nestjs/microservices/server/server-redis';

const port = 3001;
const server = express();
server.use(bodyParser());

const app = NestFactory.create(ApplicationModule, server);
const microservice = app.connectMicroservice({
    strategy: new ServerRedis({}),
});
app.startAllMicroservices(() => console.log('All microservices are listening...'));
app.listen(port, () => {
    console.log('Application listen on port:', port);
    //app.close();
});