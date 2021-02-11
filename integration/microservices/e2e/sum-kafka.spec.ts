import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { BusinessDto } from '../src/kafka/dtos/business.dto';
import { UserDto } from '../src/kafka/dtos/user.dto';
import { UserEntity } from '../src/kafka/entities/user.entity';
import { KafkaController } from '../src/kafka/kafka.controller';
import { KafkaMessagesController } from '../src/kafka/kafka.messages.controller';

describe('Kafka transport', function () {
  let server;
  let app: INestApplication;

  // set timeout to be longer (especially for the after hook)
  this.timeout(30000);
  this.retries(10);

  it(`Start Kafka app`, async () => {
    const module = await Test.createTestingModule({
      controllers: [KafkaController, KafkaMessagesController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice({
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: ['localhost:9092'],
        },
      },
    });
    app.enableShutdownHooks();
    await app.startAllMicroservices();
    await app.init();
  }).timeout(30000);

  it(`/POST (sync sum kafka message)`, () => {
    return request(server)
      .post('/mathSumSyncKafkaMessage')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (sync sum kafka(ish) message without key and only the value)`, () => {
    return request(server)
      .post('/mathSumSyncWithoutKey')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (sync sum plain object)`, () => {
    return request(server)
      .post('/mathSumSyncPlainObject')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (sync sum array)`, () => {
    return request(server)
      .post('/mathSumSyncArray')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (sync sum string)`, () => {
    return request(server)
      .post('/mathSumSyncString')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (sync sum number)`, () => {
    return request(server)
      .post('/mathSumSyncNumber')
      .send([12345])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (async event notification)`, done => {
    request(server)
      .post('/notify')
      .send()
      .end(() => {
        setTimeout(() => {
          expect(KafkaController.IS_NOTIFIED).to.be.true;
          done();
        }, 1000);
      });
  });

  const userDto: UserDto = {
    email: 'enriquebenavidesm@gmail.com',
    name: 'Ben',
    phone: '1112223331',
    years: 33,
  };
  const newUser: UserEntity = new UserEntity(userDto);
  const businessDto: BusinessDto = {
    name: 'Example',
    phone: '2233441122',
    user: newUser,
  };
  it(`/POST (sync command create user)`, () => {
    return request(server).post('/user').send(userDto).expect(200);
  });

  it(`/POST (sync command create business`, () => {
    return request(server).post('/business').send(businessDto).expect(200);
  });

  it(`/POST (sync command create user) Concurrency Test`, async () => {
    const promises = [];
    for (let concurrencyKey = 0; concurrencyKey < 100; concurrencyKey++) {
      const innerUserDto = JSON.parse(JSON.stringify(userDto));
      innerUserDto.name += `+${concurrencyKey}`;
      promises.push(request(server).post('/user').send(userDto).expect(200));
    }
    await Promise.all(promises);
  });

  after(`Stopping Kafka app`, async () => {
    await app.close();
  });
}).timeout(50000);
