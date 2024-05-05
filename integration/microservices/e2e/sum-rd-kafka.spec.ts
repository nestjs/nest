import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { BusinessDto } from '../src/rd-kafka/dtos/business.dto';
import { UserDto } from '../src/rd-kafka/dtos/user.dto';
import { UserEntity } from '../src/rd-kafka/entities/user.entity';
import { RdKafkaController } from '../src/rd-kafka/rd-kafka.controller';
import { RdKafkaMessagesController } from '../src/rd-kafka/rd-kafka.messages.controller';

describe('RdKafka transport', function () {
  let server: any;
  let app: INestApplication;

  // set timeout to be longer (especially for the after hook)
  this.timeout(50000);
  this.retries(10);

  before(`Start Kafka app`, async () => {
    const module = await Test.createTestingModule({
      controllers: [RdKafkaController, RdKafkaMessagesController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RD_KAFKA,
      options: {
        client: {
          'metadata.broker.list': 'localhost:9092'
        }
      },
    });
    app.enableShutdownHooks();
    await app.startAllMicroservices();
    await app.init();
  });

  // it(`/POST (sync sum kafka message)`, function () {
  //   return request(server)
  //     .post('/mathSumSyncKafkaMessage')
  //     .send([1, 2, 3, 4, 5])
  //     .expect(200)
  //     .expect(200, '15');
  // });

  // it(`/POST (sync sum kafka(ish) message without key and only the value)`, () => {
  //   return request(server)
  //     .post('/mathSumSyncWithoutKey')
  //     .send([1, 2, 3, 4, 5])
  //     .expect(200)
  //     .expect(200, '15');
  // });

  // it(`/POST (sync sum plain object)`, () => {
  //   return request(server)
  //     .post('/mathSumSyncPlainObject')
  //     .send([1, 2, 3, 4, 5])
  //     .expect(200)
  //     .expect(200, '15');
  // });

  // it(`/POST (sync sum array)`, () => {
  //   return request(server)
  //     .post('/mathSumSyncArray')
  //     .send([1, 2, 3, 4, 5])
  //     .expect(200)
  //     .expect(200, '15');
  // });

  // it(`/POST (sync sum string)`, () => {
  //   return request(server)
  //     .post('/mathSumSyncString')
  //     .send([1, 2, 3, 4, 5])
  //     .expect(200)
  //     .expect(200, '15');
  // });

  // it(`/POST (sync sum number)`, () => {
  //   return request(server)
  //     .post('/mathSumSyncNumber')
  //     .send([12345])
  //     .expect(200)
  //     .expect(200, '15');
  // });

  it(`/POST (async event notification)`, done => {
    request(server)
      .post('/notify')
      .send()
      .end(() => {
        setTimeout(() => {
          expect(RdKafkaController.IS_NOTIFIED).to.be.true;
          done();
        }, 1000);
      });
  });

  // const userDto: UserDto = {
  //   email: 'enriquebenavidesm@gmail.com',
  //   name: 'Ben',
  //   phone: '1112223331',
  //   years: 33,
  // };
  // const newUser: UserEntity = new UserEntity(userDto);
  // const businessDto: BusinessDto = {
  //   name: 'Example',
  //   phone: '2233441122',
  //   user: newUser,
  // };
  // it(`/POST (sync command create user)`, () => {
  //   return request(server).post('/user').send(userDto).expect(200);
  // });

  // it(`/POST (sync command create business`, () => {
  //   return request(server).post('/business').send(businessDto).expect(200);
  // });

  // it(`/POST (sync command create user) Concurrency Test`, async () => {
  //   const promises = [];
  //   for (let concurrencyKey = 0; concurrencyKey < 100; concurrencyKey++) {
  //     const innerUserDto = JSON.parse(JSON.stringify(userDto));
  //     innerUserDto.name += `+${concurrencyKey}`;
  //     promises.push(request(server).post('/user').send(userDto).expect(200));
  //   }
  //   await Promise.all(promises);
  // });

  after(`Stopping Kafka app`, async () => {
    await app.close();
  });
});
