import {
  INestApplication,
} from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { KafkaController } from '../src/kafka/kafka.controller';
import { KafkaMessagesController } from '../src/kafka/kafka.messages.controller';
import { UserDto } from '../src/kafka/dtos/user.dto';
import { UserEntity } from '../src/kafka/entities/user.entity';
import { BusinessDto } from '../src/kafka/dtos/business.dto';

describe('Kafka transport', () => {
  let server;
  let app: INestApplication;

  it(`Start Kafka app`, async () => {
    const module = await Test.createTestingModule({
      controllers: [
        KafkaController,
        KafkaMessagesController,
      ],
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
    await app.startAllMicroservicesAsync();
    await app.init();
  }).timeout(30000);

  it(`/POST (async command sum)`, () => {
    return request(server)
      .post('/?command=math.sum')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  }).timeout(50000);

  it(`/POST (async event notification)`, done => {
    request(server)
      .post('/notify')
      .send()
      .end(() => {
        expect(KafkaController.IS_NOTIFIED).to.be.true;
        done();
      });
  }).timeout(5000);

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
  it(`/POST (async command create user)`, () => {
    return request(server)
      .post('/user')
      .send(userDto)
      .expect(200);
  }).timeout(50000);

  it(`/POST (async command create business`, () => {
    return request(server)
      .post('/business')
      .send(businessDto)
      .expect(200);
  }).timeout(50000);

  it(`/POST (async command create user) Concurrency Test`, async () => {
    const promises = [];
    for (let concurrencyKey = 0; concurrencyKey < 100; concurrencyKey++) {
      const innerUserDto = JSON.parse(JSON.stringify(userDto));
      innerUserDto.name += `+${concurrencyKey}`;
      promises.push(request(server).post('/user').send(userDto).expect(200));
    }
    await Promise.all(promises);
  }).timeout(50000);

  after(`Stopping Kafka app`, async () => {
    await app.close();
  });
}).timeout(30000);
