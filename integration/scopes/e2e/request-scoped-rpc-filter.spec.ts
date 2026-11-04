import {
  ArgumentsHost,
  CanActivate,
  Catch,
  Controller,
  ExceptionFilter,
  INestApplication,
  INestMicroservice,
  Inject,
  Injectable,
  Module,
  Scope,
  SetMetadata,
  Type,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ENTRY_PROVIDER_WATERMARK } from '@nestjs/common/internal';
import { APP_FILTER, ExternalContextCreator, REQUEST } from '@nestjs/core';
import {
  ClientProxy,
  ClientProxyFactory,
  MessagePattern,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

const STATIC_PORT = 3893;
const SCOPED_PORT = 3894;
const STRING_PORT = 3895;
const OBJECT_PORT = 3896;
const PROMISE_PORT = 3897;
const TRANSIENT_PORT = 3898;
const TRANSIENT_STATIC_PORT = 3899;
const TRANSIENT_SCOPED_PORT = 3900;
const TRANSIENT_GUARD_PORT = 3901;
const ORIGINAL_ERROR_PORT = 3902;
const METHOD_FILTER_PORT = 3903;

interface MessageRequest {
  getData(): unknown;
}

@Catch()
@Injectable({ scope: Scope.REQUEST })
class PayloadFilter implements ExceptionFilter {
  constructor(@Inject(REQUEST) private readonly request: MessageRequest) {}

  catch() {
    return of(`saw:${String(this.request.getData())}`);
  }
}

@Catch()
@Injectable({ scope: Scope.REQUEST })
class StringPayloadFilter implements ExceptionFilter {
  constructor(@Inject(REQUEST) private readonly request: MessageRequest) {}

  catch() {
    return `saw:${String(this.request.getData())}`;
  }
}

@Catch()
@Injectable({ scope: Scope.REQUEST })
class ObjectPayloadFilter implements ExceptionFilter {
  constructor(@Inject(REQUEST) private readonly request: MessageRequest) {}

  catch() {
    return { saw: String(this.request.getData()) };
  }
}

@Catch()
@Injectable({ scope: Scope.REQUEST })
class PromisePayloadFilter implements ExceptionFilter {
  constructor(@Inject(REQUEST) private readonly request: MessageRequest) {}

  catch() {
    return Promise.resolve(`saw:${String(this.request.getData())}`);
  }
}

@Catch()
@Injectable({ scope: Scope.TRANSIENT })
class RecoveringTransientFilter implements ExceptionFilter {
  private readonly token = 'recovered';

  catch() {
    return of(this.token);
  }
}

@Catch()
@Injectable({ scope: Scope.REQUEST })
class HeaderFilter implements ExceptionFilter {
  constructor(
    @Inject(REQUEST)
    private readonly request: { headers?: Record<string, string> },
  ) {}

  catch(_exception: unknown, _host: ArgumentsHost) {
    return this.request.headers?.['x-id'];
  }
}

@Injectable({ scope: Scope.REQUEST })
class RequestHeaders {
  constructor(
    @Inject(REQUEST)
    readonly request: { headers?: Record<string, string> },
  ) {}
}

@Catch()
@Injectable({ scope: Scope.TRANSIENT })
class TransientHeaderFilter implements ExceptionFilter {
  constructor(private readonly headers: RequestHeaders) {}

  catch() {
    return `transient:${this.headers.request.headers?.['x-id']}`;
  }
}

@Injectable({ scope: Scope.REQUEST })
class MessageData {
  constructor(@Inject(REQUEST) readonly request: MessageRequest) {}
}

@Catch()
@Injectable({ scope: Scope.TRANSIENT })
class TransientPayloadFilter implements ExceptionFilter {
  constructor(private readonly data: MessageData) {}

  catch() {
    return `transient:${String(this.data.request.getData())}`;
  }
}

class PlainService {
  read(_request?: { headers?: Record<string, string> }) {
    throw new Error('boom');
  }
}

@Injectable({ scope: Scope.REQUEST })
class ExplodingGuard implements CanActivate {
  constructor() {
    throw new Error('guard');
  }

  canActivate() {
    return true;
  }
}

@Controller()
@UseGuards(ExplodingGuard)
class GuardedMessageController {
  @MessagePattern('fail')
  fail() {
    return 'should-not-run';
  }
}

class SpecialError extends Error {}

@Catch(SpecialError)
@Injectable({ scope: Scope.TRANSIENT })
class StaticTransientFilter implements ExceptionFilter {
  // Field initializers run in the constructor, so the prototype has no token.
  private readonly token = 'built';

  catch() {
    return `transient:${this.token}`;
  }
}

@Catch(TypeError)
@Injectable({ scope: Scope.REQUEST })
class UnrelatedRequestFilter implements ExceptionFilter {
  catch() {
    return 'unrelated';
  }
}

class SpecialService {
  read(_request?: object) {
    throw new SpecialError('boom');
  }
}

@Catch()
@Injectable({ scope: Scope.REQUEST })
class MessageFilter implements ExceptionFilter {
  catch(exception: Error) {
    return `caught:${exception.message}`;
  }
}

@Controller()
class StaticMessageController {
  @MessagePattern('fail')
  fail() {
    throw new Error('boom');
  }
}

@Injectable({ scope: Scope.REQUEST })
class ExplodingDependency {
  constructor(@Inject(REQUEST) request: MessageRequest) {
    throw new Error(`setup:${String(request.getData())}`);
  }
}

@Controller()
class ScopedMessageController {
  constructor(private readonly dependency: ExplodingDependency) {}

  @MessagePattern('fail')
  fail() {
    return 'should-not-run';
  }
}

@Catch()
@Injectable({ scope: Scope.TRANSIENT })
class MethodTransientFilter implements ExceptionFilter {
  private readonly token = 'method';

  catch(exception: Error) {
    return `${this.token}:${exception.message}`;
  }
}

@Controller()
class FilteredScopedMessageController {
  constructor(private readonly dependency: ExplodingDependency) {}

  @MessagePattern('fail')
  @UseFilters(MethodTransientFilter)
  fail() {
    return 'should-not-run';
  }
}

@Controller()
@UseGuards(ExplodingGuard)
class GuardedScopedMessageController {
  constructor(private readonly dependency: ExplodingDependency) {}

  @MessagePattern('fail')
  fail() {
    return 'should-not-run';
  }
}

@Injectable()
@SetMetadata(ENTRY_PROVIDER_WATERMARK, true)
class EntryProvider {
  read(_request?: { headers?: Record<string, string> }) {
    throw new Error('boom');
  }
}

const createModule = (
  controller: Type<unknown> | undefined,
  filter: Type<ExceptionFilter>,
  extra: Type<unknown>[] = [],
) => {
  @Module({
    controllers: controller ? [controller] : [],
    providers: [...extra, { provide: APP_FILTER, useClass: filter }],
  })
  class TestModule {}
  return TestModule;
};

describe('Request-scoped global filters outside HTTP controllers', () => {
  describe('static microservice handler', () => {
    let microservice: INestMicroservice;
    let client: ClientProxy;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [createModule(StaticMessageController, PayloadFilter)],
      }).compile();
      microservice = moduleRef.createNestMicroservice<MicroserviceOptions>({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: STATIC_PORT },
      });
      await microservice.listen();
      client = ClientProxyFactory.create({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: STATIC_PORT },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client?.close();
      await microservice?.close();
    });

    it('should give each message its own request-scoped filter', async () => {
      await expect(firstValueFrom(client.send('fail', 'alpha'))).resolves.toBe(
        'saw:alpha',
      );
      await expect(firstValueFrom(client.send('fail', 'beta'))).resolves.toBe(
        'saw:beta',
      );
    });
  });

  describe('request-scoped handler that fails while it is constructed', () => {
    let microservice: INestMicroservice;
    let client: ClientProxy;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          createModule(ScopedMessageController, PayloadFilter, [
            ExplodingDependency,
          ]),
        ],
      }).compile();
      microservice = moduleRef.createNestMicroservice<MicroserviceOptions>({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: SCOPED_PORT },
      });
      await microservice.listen();
      client = ClientProxyFactory.create({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: SCOPED_PORT },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client?.close();
      await microservice?.close();
    });

    it('should recover with that message and not the previous one', async () => {
      await expect(firstValueFrom(client.send('fail', 'one'))).resolves.toBe(
        'saw:one',
      );
      await expect(firstValueFrom(client.send('fail', 'two'))).resolves.toBe(
        'saw:two',
      );
    });
  });

  describe('external handler', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [createModule(undefined, HeaderFilter, [EntryProvider])],
      }).compile();
      app = moduleRef.createNestApplication();
      await listenOnLoopback(app);
    });

    afterAll(async () => {
      await app?.close();
    });

    const handlerFor = () => {
      // Built once, the way a static external handler is: no context id.
      // app.get() cannot return EntryProvider once the request-scoped filter
      // is attached to it.
      const instance = new EntryProvider();
      return app
        .get(ExternalContextCreator)
        .create(instance, instance.read, 'read');
    };

    it('should read the request the handler was called with', async () => {
      const handler = handlerFor();

      await expect(handler({ headers: { 'x-id': 'a' } })).resolves.toBe('a');
      await expect(handler({ headers: { 'x-id': 'b' } })).resolves.toBe('b');
    });

    it('should keep the default filter when the call has no request', async () => {
      const handler = handlerFor();

      await expect(handler()).rejects.toThrow('boom');
    });

    it('should keep the error when the request cannot be extended', async () => {
      const handler = handlerFor();

      await expect(
        handler(Object.freeze({ headers: { 'x-id': 'a' } })),
      ).rejects.toThrow('boom');
    });

    it('should keep the default filter for a websocket host', async () => {
      // Argument 0 of a websocket host is the client socket, which outlives
      // the call, so it must not carry the context id of one failure.
      const instance = new EntryProvider();
      const handler = app
        .get(ExternalContextCreator)
        .create(
          instance,
          instance.read,
          'read',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'ws',
        );
      const socket = { headers: { 'x-id': 'a' } };

      await expect(handler(socket)).rejects.toThrow('boom');
      expect(Object.getOwnPropertySymbols(socket)).toEqual([]);
    });
  });

  describe('external handler with a transient filter on a request-scoped provider', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          createModule(undefined, TransientHeaderFilter, [
            EntryProvider,
            RequestHeaders,
          ]),
        ],
      }).compile();
      app = moduleRef.createNestApplication();
      await listenOnLoopback(app);
    });

    afterAll(async () => {
      await app?.close();
    });

    it('should run the transient filter for a handler with no host', async () => {
      const instance = new PlainService();
      const handler = app
        .get(ExternalContextCreator)
        .create(instance, instance.read, 'read');

      await expect(handler({ headers: { 'x-id': 'c' } })).resolves.toBe(
        'transient:c',
      );
    });

    it('should run the transient filter built for that call', async () => {
      const instance = new EntryProvider();
      const handler = app
        .get(ExternalContextCreator)
        .create(instance, instance.read, 'read');

      await expect(handler({ headers: { 'x-id': 'a' } })).resolves.toBe(
        'transient:a',
      );
      await expect(handler({ headers: { 'x-id': 'b' } })).resolves.toBe(
        'transient:b',
      );
    });
  });

  describe('external handler with a static transient filter next to a request-scoped one', () => {
    let app: INestApplication;

    beforeAll(async () => {
      @Module({
        providers: [
          { provide: APP_FILTER, useClass: UnrelatedRequestFilter },
          { provide: APP_FILTER, useClass: StaticTransientFilter },
        ],
      })
      class MixedFiltersModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [MixedFiltersModule],
      }).compile();
      app = moduleRef.createNestApplication();
      await listenOnLoopback(app);
    });

    afterAll(async () => {
      await app?.close();
    });

    it('should run the instance built for the call when there is no host', async () => {
      const instance = new SpecialService();
      const handler = app
        .get(ExternalContextCreator)
        .create(instance, instance.read, 'read');

      await expect(handler({ headers: {} })).resolves.toBe('transient:built');
    });
  });

  describe('request-scoped handler whose dependency and guard both fail', () => {
    let microservice: INestMicroservice;
    let client: ClientProxy;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          createModule(GuardedScopedMessageController, MessageFilter, [
            ExplodingDependency,
          ]),
        ],
      }).compile();
      microservice = moduleRef.createNestMicroservice<MicroserviceOptions>({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: ORIGINAL_ERROR_PORT },
      });
      await microservice.listen();
      client = ClientProxyFactory.create({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: ORIGINAL_ERROR_PORT },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client?.close();
      await microservice?.close();
    });

    it('should pass the error that stopped the message to the filter', async () => {
      await expect(firstValueFrom(client.send('fail', 'one'))).resolves.toBe(
        'caught:setup:one',
      );
    });
  });

  describe('handler filter when a dependency of the handler fails', () => {
    let microservice: INestMicroservice;
    let client: ClientProxy;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          createModule(
            FilteredScopedMessageController,
            UnrelatedRequestFilter,
            [ExplodingDependency],
          ),
        ],
      }).compile();
      microservice = moduleRef.createNestMicroservice<MicroserviceOptions>({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: METHOD_FILTER_PORT },
      });
      await microservice.listen();
      client = ClientProxyFactory.create({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: METHOD_FILTER_PORT },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client?.close();
      await microservice?.close();
    });

    it('should run the transient filter of the handler, not its prototype', async () => {
      await expect(firstValueFrom(client.send('fail', 'one'))).resolves.toBe(
        'method:setup:one',
      );
    });
  });

  describe('request-scoped filter that returns a plain value', () => {
    const start = async (
      port: number,
      filter: Type<ExceptionFilter>,
    ): Promise<{ microservice: INestMicroservice; client: ClientProxy }> => {
      const moduleRef = await Test.createTestingModule({
        imports: [createModule(StaticMessageController, filter)],
      }).compile();
      const microservice =
        moduleRef.createNestMicroservice<MicroserviceOptions>({
          transport: Transport.TCP,
          options: { host: '127.0.0.1', port },
        });
      await microservice.listen();
      const client = ClientProxyFactory.create({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port },
      });
      await client.connect();
      return { microservice, client };
    };

    it('should return the whole string, not its first character', async () => {
      const { microservice, client } = await start(
        STRING_PORT,
        StringPayloadFilter,
      );

      try {
        await expect(
          firstValueFrom(client.send('fail', 'alpha')),
        ).resolves.toBe('saw:alpha');
      } finally {
        await client.close();
        await microservice.close();
      }
    });

    it('should return a plain object from the filter', async () => {
      const { microservice, client } = await start(
        OBJECT_PORT,
        ObjectPayloadFilter,
      );

      try {
        await expect(
          firstValueFrom(client.send('fail', 'alpha')),
        ).resolves.toEqual({ saw: 'alpha' });
      } finally {
        await client.close();
        await microservice.close();
      }
    });

    it('should return the value a filter promise resolves to', async () => {
      const { microservice, client } = await start(
        PROMISE_PORT,
        PromisePayloadFilter,
      );

      try {
        await expect(
          firstValueFrom(client.send('fail', 'alpha')),
        ).resolves.toBe('saw:alpha');
      } finally {
        await client.close();
        await microservice.close();
      }
    });
  });

  describe('transient filter when construction fails', () => {
    let microservice: INestMicroservice;
    let client: ClientProxy;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          createModule(ScopedMessageController, RecoveringTransientFilter, [
            ExplodingDependency,
          ]),
        ],
      }).compile();
      microservice = moduleRef.createNestMicroservice<MicroserviceOptions>({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: TRANSIENT_PORT },
      });
      await microservice.listen();
      client = ClientProxyFactory.create({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: TRANSIENT_PORT },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client?.close();
      await microservice?.close();
    });

    it('should run the constructed transient filter for that message', async () => {
      await expect(firstValueFrom(client.send('fail', 'one'))).resolves.toBe(
        'recovered',
      );
    });
  });

  describe('transient filter on a request-scoped provider', () => {
    const start = async (
      port: number,
      controller: Type<unknown>,
      extra: Type<unknown>[] = [],
    ): Promise<{ microservice: INestMicroservice; client: ClientProxy }> => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          createModule(controller, TransientPayloadFilter, [
            MessageData,
            ...extra,
          ]),
        ],
      }).compile();
      const microservice =
        moduleRef.createNestMicroservice<MicroserviceOptions>({
          transport: Transport.TCP,
          options: { host: '127.0.0.1', port },
        });
      await microservice.listen();
      const client = ClientProxyFactory.create({
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port },
      });
      await client.connect();
      return { microservice, client };
    };

    it('should run it for each message of a handler that throws', async () => {
      const { microservice, client } = await start(
        TRANSIENT_STATIC_PORT,
        StaticMessageController,
      );

      try {
        await expect(
          firstValueFrom(client.send('fail', 'alpha')),
        ).resolves.toBe('transient:alpha');
        await expect(firstValueFrom(client.send('fail', 'beta'))).resolves.toBe(
          'transient:beta',
        );
      } finally {
        await client.close();
        await microservice.close();
      }
    });

    it('should run it when an enhancer of the handler fails', async () => {
      const { microservice, client } = await start(
        TRANSIENT_GUARD_PORT,
        GuardedMessageController,
      );

      try {
        await expect(firstValueFrom(client.send('fail', 'one'))).resolves.toBe(
          'transient:one',
        );
      } finally {
        await client.close();
        await microservice.close();
      }
    });

    it('should run it when a dependency of the handler fails', async () => {
      const { microservice, client } = await start(
        TRANSIENT_SCOPED_PORT,
        ScopedMessageController,
        [ExplodingDependency],
      );

      try {
        await expect(firstValueFrom(client.send('fail', 'one'))).resolves.toBe(
          'transient:one',
        );
        await expect(firstValueFrom(client.send('fail', 'two'))).resolves.toBe(
          'transient:two',
        );
      } finally {
        await client.close();
        await microservice.close();
      }
    });
  });
});
