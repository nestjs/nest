import { PlatformaticKafkaClient } from '../../helpers/platformatic-kafka-client.js';
import {
  createKafkaClient,
  getKafkaIdentity,
} from '../../utils/kafka-client.utils.js';

describe('getKafkaIdentity', () => {
  it('should default the brokers and ids, with the postfix', () => {
    expect(getKafkaIdentity({}, '-server')).toEqual({
      brokers: ['localhost:9092'],
      clientId: 'nestjs-consumer-server',
      groupId: 'nestjs-group-server',
    });
  });

  it('should take the brokers and ids of kafkajs options', () => {
    expect(
      getKafkaIdentity(
        {
          client: { brokers: ['broker:9092'], clientId: 'app' },
          consumer: { groupId: 'group' },
        },
        '-client',
      ),
    ).toEqual({
      brokers: ['broker:9092'],
      clientId: 'app-client',
      groupId: 'group-client',
    });
  });

  it('should take the bootstrap brokers of @platformatic/kafka options', () => {
    const options = {
      driver: 'platformatic',
      client: { bootstrapBrokers: ['broker:9092'], clientId: 'app' },
      consumer: { groupId: 'group' },
    } as any;

    expect(getKafkaIdentity(options, '-server')).toEqual({
      brokers: ['broker:9092'],
      clientId: 'app-server',
      groupId: 'group-server',
    });
  });

  it('should ignore kafkajs brokers on @platformatic/kafka', () => {
    const options = {
      driver: 'platformatic',
      client: { brokers: ['broker:9092'] },
    } as any;

    expect(getKafkaIdentity(options, '-server').brokers).toEqual([
      'localhost:9092',
    ]);
  });
});

describe('createKafkaClient', () => {
  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
  let loadPackage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loadPackage = vi.fn();
  });

  const create = (options: Record<string, any>) =>
    createKafkaClient({
      options,
      brokers: ['broker:9092'],
      clientId: 'app-server',
      logger,
      loadPackage,
    });

  it('should create a kafkajs client from the options, the brokers and the client id', async () => {
    const Kafka = vi.fn(function (this: any, config: unknown) {
      this.config = config;
    });
    loadPackage.mockResolvedValue({ Kafka });

    const client: any = await create({
      client: { brokers: ['ignored:9092'], clientId: 'ignored', ssl: true },
    });

    expect(loadPackage).toHaveBeenCalledWith('kafkajs', expect.any(Function));
    expect(client.config).toEqual({
      logCreator: expect.any(Function),
      ssl: true,
      brokers: ['broker:9092'],
      clientId: 'app-server',
    });
  });

  it('should load @platformatic/kafka when the driver option names it', async () => {
    const kafkaPackage = { Consumer: vi.fn(), Producer: vi.fn() };
    loadPackage.mockResolvedValue(kafkaPackage);

    const client: any = await create({
      driver: 'platformatic',
      client: { bootstrapBrokers: ['ignored:9092'], connectTimeout: 1000 },
    });

    expect(loadPackage).toHaveBeenCalledWith(
      '@platformatic/kafka',
      expect.any(Function),
    );
    expect(client).toBeInstanceOf(PlatformaticKafkaClient);
    expect(client.kafkaPackage).toBe(kafkaPackage);
    expect(client.options).toEqual({
      connectTimeout: 1000,
      bootstrapBrokers: ['broker:9092'],
      clientId: 'app-server',
    });
  });

  it('should reject brokers given as a function on @platformatic/kafka', async () => {
    await expect(
      createKafkaClient({
        options: { driver: 'platformatic' } as any,
        brokers: () => ['broker:9092'],
        clientId: 'app-server',
        logger,
        loadPackage,
      }),
    ).rejects.toThrow('@platformatic/kafka takes a list of brokers');
    expect(loadPackage).not.toHaveBeenCalled();
  });
});
