import { loadPackage, tryLoadPackage } from '../../../common/internal.js';
import {
  createKafkaClient,
  KafkaClientIdentity,
} from '../../utils/kafka-client.utils.js';

vi.mock('../../../common/internal.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../common/internal.js')>()),
  loadPackage: vi.fn(),
  tryLoadPackage: vi.fn(),
}));

class KafkaConfigError extends Error {
  override readonly name = 'KafkaConfigError';

  constructor(
    readonly tag: string,
    readonly path?: string,
  ) {
    super(tag);
  }
}

describe('createKafkaClient', () => {
  // What the transport's constructor sets up when the options give nothing
  const defaultIdentity: KafkaClientIdentity = {
    brokers: ['localhost:9092'],
    clientId: 'nestjs-consumer-server',
    groupId: 'nestjs-group-server',
  };
  const AssignerProtocol = { MemberMetadata: {}, MemberAssignment: {} };
  let resolveKafkaConfigAsync: ReturnType<typeof vi.fn>;
  let from: ReturnType<typeof vi.fn>;
  let kafkaCore: Record<string, unknown>;
  let KafkaJs: ReturnType<typeof vi.fn>;
  let kafkajs: Record<string, unknown>;
  let logger: Record<'log' | 'warn' | 'error', ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    resolveKafkaConfigAsync = vi.fn();
    from = vi.fn(() => 'kafka-core client');
    kafkaCore = { resolveKafkaConfigAsync, Kafka: { from }, AssignerProtocol };
    KafkaJs = vi.fn(function (this: any, config: unknown) {
      this.config = config;
    });
    kafkajs = { Kafka: KafkaJs, AssignerProtocol };
    logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    vi.mocked(loadPackage).mockReset();
    vi.mocked(tryLoadPackage).mockReset();
    vi.mocked(tryLoadPackage).mockImplementation(async name =>
      name === 'kafkajs' ? kafkajs : null,
    );
  });

  const create = (
    options: Record<string, any>,
    identity: KafkaClientIdentity = defaultIdentity,
  ) =>
    createKafkaClient({
      options,
      identity,
      postfixId: '-server',
      logger: logger as any,
      loadPackage: (name, loader) => loadPackage(name, 'ServerKafka', loader),
    });

  describe('on kafka-core', () => {
    beforeEach(() => {
      vi.mocked(loadPackage).mockResolvedValue(kafkaCore);
    });

    const createOnKafkaCore = (
      options: Record<string, any>,
      identity?: KafkaClientIdentity,
    ) => create({ driver: 'kafka-core', ...options }, identity);

    it('should create the client from the options it passes to kafka-core', async () => {
      const client = { brokers: ['broker:9092'], clientId: 'app' };
      resolveKafkaConfigAsync.mockResolvedValue({
        config: client,
        fileConfig: null,
      });
      const identity = {
        brokers: ['broker:9092'],
        clientId: 'app-server',
        groupId: 'nestjs-group-server',
      };

      const result = await createOnKafkaCore({ client }, identity);

      expect(resolveKafkaConfigAsync).toHaveBeenCalledExactlyOnceWith(
        client,
        expect.anything(),
      );
      expect(from).toHaveBeenCalledExactlyOnceWith(
        {},
        expect.objectContaining({
          brokers: ['broker:9092'],
          clientId: 'app-server',
          logCreator: expect.any(Function),
        }),
      );
      expect(result).toEqual({
        client: 'kafka-core client',
        identity,
        assignerProtocol: AssignerProtocol,
      });
    });

    it('should take the brokers and ids the transport defaulted from the config file', async () => {
      const fileConfig = {
        client: { brokers: ['file:9092'], clientId: 'file-app' },
        consumer: { groupId: 'file-group' },
      };
      resolveKafkaConfigAsync.mockResolvedValue({
        config: fileConfig.client,
        fileConfig,
      });

      const result = await createOnKafkaCore({});

      expect(result.identity).toEqual({
        brokers: ['file:9092'],
        clientId: 'file-app-server',
        groupId: 'file-group-server',
      });
      expect(from).toHaveBeenCalledExactlyOnceWith(
        fileConfig,
        expect.objectContaining({
          brokers: ['file:9092'],
          clientId: 'file-app-server',
        }),
      );
    });

    it('should keep a group id from the options over the config file', async () => {
      resolveKafkaConfigAsync.mockResolvedValue({
        config: { brokers: ['file:9092'] },
        fileConfig: { consumer: { groupId: 'file-group' } },
      });

      // The option equals the default, so only the options tell it was set
      const result = await createOnKafkaCore({
        consumer: { groupId: 'nestjs-group' },
      });

      expect(result.identity.groupId).toBe('nestjs-group-server');
    });

    it('should keep the brokers and ids a subclass set over the config file', async () => {
      resolveKafkaConfigAsync.mockResolvedValue({
        config: { brokers: ['file:9092'], clientId: 'file-app' },
        fileConfig: { consumer: { groupId: 'file-group' } },
      });
      const identity = {
        brokers: ['custom:9092'],
        clientId: 'custom-client',
        groupId: 'custom-group',
      };

      const result = await createOnKafkaCore({}, identity);

      expect(result.identity).toEqual(identity);
    });

    it('should default to the local broker when there are no brokers and no config file', async () => {
      resolveKafkaConfigAsync.mockRejectedValue(
        new KafkaConfigError('MissingBrokers'),
      );

      const result = await createOnKafkaCore({ client: { config: false } });

      expect(result.identity).toEqual(defaultIdentity);
      expect(from).toHaveBeenCalledExactlyOnceWith(
        {},
        expect.objectContaining({ brokers: ['localhost:9092'] }),
      );
    });

    it('should reject when a config file has no brokers', async () => {
      const error = new KafkaConfigError(
        'MissingBrokers',
        '/app/kafka.config.ts',
      );
      resolveKafkaConfigAsync.mockRejectedValue(error);

      await expect(createOnKafkaCore({})).rejects.toBe(error);
    });

    it.each([
      [
        'a config file that cannot be loaded',
        new KafkaConfigError('LoadFailed'),
      ],
      ['any other error', new Error('failed')],
    ])('should reject on %s', async (_, error) => {
      resolveKafkaConfigAsync.mockRejectedValue(error);

      await expect(createOnKafkaCore({})).rejects.toBe(error);
    });

    it('should log the diagnostics of the config file', async () => {
      resolveKafkaConfigAsync.mockImplementation(
        async (_, { onDiagnostic }) => {
          onDiagnostic({ level: 'info', message: 'Loaded kafka config' });
          onDiagnostic({ level: 'warn', message: 'Two config files' });
          return { config: { brokers: ['file:9092'] }, fileConfig: {} };
        },
      );

      await createOnKafkaCore({});

      expect(logger.log).toHaveBeenCalledExactlyOnceWith('Loaded kafka config');
      expect(logger.warn).toHaveBeenCalledExactlyOnceWith('Two config files');
    });

    it('should load kafka-core when the driver option names it', async () => {
      resolveKafkaConfigAsync.mockResolvedValue({
        config: { brokers: ['broker:9092'] },
        fileConfig: null,
      });

      await createOnKafkaCore({});

      expect(loadPackage).toHaveBeenCalledExactlyOnceWith(
        '@cookiemonsterdev/kafka-core',
        'ServerKafka',
        expect.any(Function),
      );
      expect(tryLoadPackage).not.toHaveBeenCalled();
    });
  });

  describe('on kafkajs', () => {
    it('should create the client from the options and the identity, as before kafka-core', async () => {
      vi.mocked(loadPackage).mockResolvedValue(kafkajs);

      const identity = { ...defaultIdentity, brokers: ['broker:9092'] };

      const result = await create(
        { driver: 'kafkajs', client: { brokers: ['broker:9092'], ssl: true } },
        identity,
      );

      expect(KafkaJs).toHaveBeenCalledExactlyOnceWith({
        logCreator: expect.any(Function),
        ssl: true,
        brokers: ['broker:9092'],
        clientId: 'nestjs-consumer-server',
      });
      expect(result.client).toBeInstanceOf(KafkaJs);
      expect(result.identity).toBe(identity);
      expect(result.assignerProtocol).toBe(AssignerProtocol);
      expect(resolveKafkaConfigAsync).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should run on kafkajs, with a one-time warning, when it is installed and no driver is set', async () => {
      await create({});
      await create({});

      expect(KafkaJs).toHaveBeenCalledTimes(2);
      expect(tryLoadPackage).not.toHaveBeenCalledWith(
        '@cookiemonsterdev/kafka-core',
        expect.anything(),
      );
      expect(logger.warn).toHaveBeenCalledOnce();
      expect(logger.warn.mock.calls[0][0]).toContain('deprecated');
    });
  });

  it('should run on kafka-core when kafkajs is not installed and no driver is set', async () => {
    vi.mocked(tryLoadPackage).mockResolvedValue(null);
    vi.mocked(loadPackage).mockResolvedValue(kafkaCore);
    resolveKafkaConfigAsync.mockResolvedValue({
      config: { brokers: ['broker:9092'] },
      fileConfig: null,
    });

    const result = await create({ client: { brokers: ['broker:9092'] } });

    expect(result.client).toBe('kafka-core client');
    // Only the driver option opts into config files
    expect(resolveKafkaConfigAsync).toHaveBeenCalledExactlyOnceWith(
      { config: false, brokers: ['broker:9092'] },
      expect.anything(),
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  describe('on a Node.js release older than kafka-core needs', () => {
    const versions = process.versions;

    beforeEach(() => {
      Object.defineProperty(process, 'versions', {
        value: { ...versions, node: '22.14.0' },
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(process, 'versions', {
        value: versions,
        configurable: true,
      });
    });

    it('should explain why kafka-core does not load', async () => {
      vi.mocked(tryLoadPackage).mockResolvedValue(null);
      vi.mocked(loadPackage).mockRejectedValue(new Error('missing'));

      await expect(create({})).rejects.toThrow('missing');
      expect(logger.error).toHaveBeenCalledExactlyOnceWith(
        '"@cookiemonsterdev/kafka-core" needs Node.js 24 or newer. Upgrade Node.js, or install kafkajs.',
      );
    });
  });

  it('should report kafka-core as missing when neither package is installed', async () => {
    vi.mocked(tryLoadPackage).mockResolvedValue(null);
    vi.mocked(loadPackage).mockRejectedValue(new Error('missing'));

    await expect(create({})).rejects.toThrow('missing');
    expect(loadPackage).toHaveBeenCalledExactlyOnceWith(
      '@cookiemonsterdev/kafka-core',
      'ServerKafka',
      expect.any(Function),
    );
  });
});
