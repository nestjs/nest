import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { Kafka } from '@nestjs/microservices/external/kafka.interface';
import { AppModule } from './app.module';

async function bootstrap() {
  /**
   * This example contains a hybrid application (HTTP + TCP)
   * You can switch to a microservice with NestFactory.createMicroservice() as follows:
   *
   * const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
   *  transport: Transport.TCP,
   *  options: { retryAttempts: 5, retryDelay: 3000 },
   * });
   * await app.listen();
   *
   */
  const app = await NestFactory.create(AppModule);
  const msvc = app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
      },
      consumer: {
        groupId: 'my-kafka-consumer',
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(Math.floor(Math.random() * 1000) + 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);

  const kafka = msvc.unwrap<Kafka>();
  const admin = kafka.admin();

  const topicName = 'math';
  try {
    const topicExists = await admin.fetchTopicMetadata({
      topics: [topicName],
    });

    console.log(
      `Topic "${topicName}" already exists with ${topicExists.topics[0].partitions.length} partitions.`,
    );

    // Update "math.reply" topic to have 2 partitions if it has only 1 partition
    const replyTopicName = 'math.reply';
    const replyTopicExists = await admin.fetchTopicMetadata({
      topics: [replyTopicName],
    });
    if (replyTopicExists.topics[0].partitions.length === 1) {
      await admin.createPartitions({
        topicPartitions: [
          {
            topic: replyTopicName,
            count: 2,
          },
        ],
      });
      console.log(`Topic "${replyTopicName}" updated with 2 partitions.`);
    }
  } catch (error) {
    if (error.message.includes('does not host this topic-partition')) {
      await admin.createTopics({
        topics: [
          {
            topic: topicName,
            numPartitions: 2,
          },
        ],
      });
      console.log(`Topic "${topicName}" created with 2 partitions.`);
    } else {
      console.error('Error creating topic:', error.message);
    }
  }
}
bootstrap();
