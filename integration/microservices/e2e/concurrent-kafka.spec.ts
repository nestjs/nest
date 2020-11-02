import * as util from 'util';

import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { KafkaConcurrentController } from '../src/kafka-concurrent/kafka-concurrent.controller';
import { KafkaConcurrentMessagesController } from '../src/kafka-concurrent/kafka-concurrent.messages.controller';

import { ITopicMetadata, Kafka, Admin, logLevel } from 'kafkajs';

describe('Kafka concurrent', function() {
  const numbersOfServers = 3;

  const requestTopic = 'math.sum.sync.number.wait';
  const responseTopic = 'math.sum.sync.number.wait.reply';

  let admin: Admin;
  const servers: any[] = [];
  const apps: INestApplication[] = [];

    // set timeout to be longer
  this.timeout(30000);

  const startServer = async () => {
    const module = await Test.createTestingModule({
      controllers: [KafkaConcurrentController, KafkaConcurrentMessagesController],
    }).compile();
  
    const app = module.createNestApplication();
    
    const server = app.getHttpAdapter().getInstance();
  
    app.connectMicroservice({
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: ['localhost:9092']
        },
        consumer: {
          maxWaitTimeInMs: 1
        },
        run: {
          partitionsConsumedConcurrently: numbersOfServers
        }
      },
    });

    app.enableShutdownHooks();

    // push to the collection
    servers.push(server);
    apps.push(app);
  
    // await the start
    await app.startAllMicroservicesAsync();
    await app.init();
  };

  it(`Create kafka topics/partitions`, async () => {
    const kafka = new Kafka({
      clientId: 'concurrent-test-admin',
      brokers: ['localhost:9092']
    });

    admin = kafka.admin();
    await admin.connect();

    let topicMetadata: {
      topics: ITopicMetadata[];
    }

    try {
      topicMetadata = await admin.fetchTopicMetadata({
        topics: [
          requestTopic,
          responseTopic
        ]
      });

      // console.log(util.format('Topic Metadata %o', topicMetadata));
    }  catch (e) {
      // create with number of servers
      try {
        await admin.createTopics({
          topics: [
            {
              topic: requestTopic,
              numPartitions: numbersOfServers,
              replicationFactor: 1
            },
            {
              topic: responseTopic,
              numPartitions: numbersOfServers,
              replicationFactor: 1
            }
          ]
        });
      } catch (e) {
        console.error(util.format('Create topics error: %o', e));
      }  
    }

    if (topicMetadata && topicMetadata.topics.length > 0) {
      // we have topics, how many partitions do they have?
      for (const topic of topicMetadata.topics) {
        if (topic.partitions.length < numbersOfServers) {
          try {
            await admin.createPartitions({
              topicPartitions: [
                {
                  topic: topic.name,
                  count: numbersOfServers
                }
              ]
            });
          } catch (e) {
            console.error(util.format('Create partitions error: %o', e));
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
            replicationFactor: 1
          },
          {
            topic: responseTopic,
            numPartitions: numbersOfServers,
            replicationFactor: 1
          }
        ]
      });
    } catch (e) {
      console.error(util.format('Create topics error: %o', e));
    }

    // disconnect
    await admin.disconnect();
  });

  it(`Start Kafka apps`, async () => {
    // start all at once
    await Promise.all(Array(numbersOfServers).fill(1).map(async () => {
      return startServer();
    }));

      // wait in intervals so that we starts the consumers async but in order
      // return new Promise((resolve) => {
      //   setTimeout(async () => {
      //     await startServer();
    
      //     return resolve();
      //   }, 250 * i);
      // });
      // }));
  }).timeout(30000);

  it(`/POST (sync sum number wait and force a consumer rebalance)`, async () => {
    return Promise.all(servers.map(async (server, index) => {
      // we are going to be shutting off server #1 and checking the response of #2 and #3
      if (index === 0) {
        return new Promise((resolve) => {
          // wait .5 of a second before closing so the consumers can re-balance
          setTimeout(async () => {
            console.log('Closing #1 Server');
            await apps[index].close();
            console.log('Closed #1 Server');
            
            return resolve();
          }, 500);
        });
      }

      // send requests
      const payload = {
        key: index,
        numbers: [1, index]
      };
      const result = (1 + index).toString();

      return request(server)
          .post('/mathSumSyncNumberWait')
          .send(payload)
          .expect(200)
          .expect(200, result);
    }));
  }).timeout(60000);

  // it(`/POST (sync sum number wait and force a consumer rebalance)`, async () => {
  //   return Promise.all(servers.map(async (server, index) => {
  //     // we are going to be shutting off server #1 and checking the response of #2 and #3
  //     if (index === 0) {
  //       return new Promise((resolve) => {
  //         // wait .5 of a second before closing so the consumers can re-balance
  //         setTimeout(async () => {
  //           console.log('Closing #1 Server');
  //           await apps[index].close();
  //           console.log('Closed #1 Server');
            
  //           return resolve();
  //         }, 500);
  //       });
  //     }

  //     // send requests
  //     const payload = {
  //       key: index,
  //       numbers: [1, index]
  //     };
  //     const result = (1 + index).toString();

  //     return request(server)
  //         .post('/mathSumSyncNumberWait')
  //         .send(payload)
  //         .expect(200)
  //         .expect(200, result);
  //   }));
  // }).timeout(60000);

  after(`Stopping Kafka app`, async () => {
    // close all concurrently
    return Promise.all(apps.map(async (app) => {
      return app.close();
    }));
  });
});
