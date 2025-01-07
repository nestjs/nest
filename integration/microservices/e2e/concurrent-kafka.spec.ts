import { INestApplication, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { Admin, ITopicMetadata, Kafka } from 'kafkajs';
import * as request from 'supertest';
import * as util from 'util';
import { KafkaConcurrentController } from '../src/kafka-concurrent/kafka-concurrent.controller';
import { KafkaConcurrentMessagesController } from '../src/kafka-concurrent/kafka-concurrent.messages.controller';

describe.skip('Kafka concurrent', function () {
  const numbersOfServers = 3;

  const requestTopic = 'math.sum.sync.number.wait';
  const responseTopic = 'math.sum.sync.number.wait.reply';

  let admin: Admin;
  const servers: any[] = [];
  const apps: INestApplication[] = [];

  const logger = new Logger('concurrent-kafka.spec.ts');

  // set timeout to be longer (especially for the after hook)
  this.timeout(30000);

  const startServer = async () => {
    const module = await Test.createTestingModule({
      controllers: [
        KafkaConcurrentController,
        KafkaConcurrentMessagesController,
      ],
    }).compile();

    // use our own logger for a little
    // Logger.overrideLogger(new Logger());

    const app = module.createNestApplication();

    const server = app.getHttpAdapter().getInstance();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: ['localhost:9092'],
        },
        run: {
          partitionsConsumedConcurrently: numbersOfServers,
        },
      },
    });

    // enable these for clean shutdown
    app.enableShutdownHooks();

    // push to the collection
    servers.push(server);
    apps.push(app);

    // await the start
    await app.startAllMicroservices();
    await app.init();
  };

  it(`Create kafka topics/partitions`, async () => {
    const kafka = new Kafka({
      clientId: 'concurrent-test-admin',
      brokers: ['localhost:9092'],
    });

    admin = kafka.admin();
    await admin.connect();

    let topicMetadata: {
      topics: ITopicMetadata[];
    };

    try {
      topicMetadata = await admin.fetchTopicMetadata({
        topics: [requestTopic, responseTopic],
      });
    } catch (e) {
      // create with number of servers
      try {
        await admin.createTopics({
          topics: [
            {
              topic: requestTopic,
              numPartitions: numbersOfServers,
              replicationFactor: 1,
            },
            {
              topic: responseTopic,
              numPartitions: numbersOfServers,
              replicationFactor: 1,
            },
          ],
        });
      } catch (e) {
        logger.error(util.format('Create topics error: %o', e));
      }
    }

    if (topicMetadata! && topicMetadata.topics.length > 0) {
      // we have topics, how many partitions do they have?
      for (const topic of topicMetadata.topics) {
        if (topic.partitions.length < numbersOfServers) {
          try {
            await admin.createPartitions({
              topicPartitions: [
                {
                  topic: topic.name,
                  count: numbersOfServers,
                },
              ],
            });
          } catch (e) {
            logger.error(util.format('Create partitions error: %o', e));
          }
        }
      }
    }

    // create with number of servers
    try {
      await admin.createTopics({
        topics: [
          {
            topic: requestTopic,
            numPartitions: numbersOfServers,
            replicationFactor: 1,
          },
          {
            topic: responseTopic,
            numPartitions: numbersOfServers,
            replicationFactor: 1,
          },
        ],
      });
    } catch (e) {
      logger.error(util.format('Create topics error: %o', e));
    }

    // disconnect
    await admin.disconnect();
  });

  it(`Start Kafka apps`, async () => {
    // start all at once
    await Promise.all(
      Array(numbersOfServers)
        .fill(1)
        .map(async (v, i) => {
          // return startServer();

          // wait in intervals so the consumers start in order
          return new Promise<void>(resolve => {
            setTimeout(async () => {
              await startServer();

              return resolve();
            }, 1000 * i);
          });
        }),
    );
  }).timeout(30000);

  it(`Concurrent messages without forcing a rebalance.`, async () => {
    // wait a second before notifying the servers to respond
    setTimeout(async () => {
      // notify the other servers that it is time to respond
      await Promise.all(
        servers.map(async server => {
          // send to all servers since indexes don't necessarily align with server consumers
          return request(server).post('/go').send();
        }),
      );
    }, 1000);

    await Promise.all(
      servers.map(async (server, index) => {
        // send requests
        const payload = {
          key: index,
          numbers: [1, index],
        };
        const result = (1 + index).toString();

        return request(server)
          .post('/mathSumSyncNumberWait')
          .send(payload)
          .expect(200)
          .expect(200, result);
      }),
    );
  });

  it(`Close kafka client consumer while waiting for message pattern response.`, async () => {
    await Promise.all(
      servers.map(async (server, index) => {
        // shut off and delete the leader
        if (index === 0) {
          return new Promise<void>(resolve => {
            // wait a second before closing so the producers can send the message to the server consumers
            setTimeout(async () => {
              // get the controller
              const controller = apps[index].get(KafkaConcurrentController);

              // close the controller clients
              await controller.client.close();

              // notify the other servers that we have stopped
              await Promise.all(
                servers.map(async server => {
                  // send to all servers since indexes don't necessarily align with server consumers
                  return request(server).post('/go').send();
                }),
              );

              return resolve();
            }, 1000);
          });
        }

        // send requests
        const payload = {
          key: index,
          numbers: [1, index],
        };
        const result = (1 + index).toString();

        return request(server)
          .post('/mathSumSyncNumberWait')
          .send(payload)
          .expect(200)
          .expect(200, result);
      }),
    );
  });

  it(`Start kafka client consumer while waiting for message pattern response.`, async () => {
    await Promise.all(
      servers.map(async (server, index) => {
        // shut off and delete the leader
        if (index === 0) {
          return new Promise<void>(resolve => {
            // wait a second before closing so the producers can send the message to the server consumers
            setTimeout(async () => {
              // get the controller
              const controller = apps[index].get(KafkaConcurrentController);

              // connect the controller client
              await controller.client.connect();

              // notify the servers that we have started
              await Promise.all(
                servers.map(async server => {
                  // send to all servers since indexes don't necessarily align with server consumers
                  return request(server).post('/go').send();
                }),
              );

              return resolve();
            }, 1000);
          });
        }

        // send requests
        const payload = {
          key: index,
          numbers: [1, index],
        };
        const result = (1 + index).toString();

        return request(server)
          .post('/mathSumSyncNumberWait')
          .send(payload)
          .expect(200)
          .expect(200, result);
      }),
    );
  });

  after(`Stopping Kafka app`, async () => {
    // close all concurrently
    return Promise.all(
      apps.map(async app => {
        return app.close();
      }),
    );
  });
});
