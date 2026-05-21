import {
  ArgumentsHost,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  Inject,
  Injectable,
  Module,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';

describe('Request-scoped factory provider', () => {
  const REQUEST_SCOPED_FACTORY = 'REQUEST_SCOPED_FACTORY';
  const REQUEST_COUNT = 1000;

  @Catch()
  class RecordingFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
      const response = host.switchToHttp().getResponse<{
        status: (code: number) => unknown;
        send: (body: unknown) => unknown;
      }>();

      response.status(500);
      response.send({
        statusCode: 500,
        message:
          exception instanceof Error
            ? exception.message
            : 'Internal server error',
      });
    }
  }

  class AuthenticatedTenant {
    constructor(
      public readonly tenantName: string,
      public readonly clientName: string,
    ) {}
  }

  @Injectable()
  class JwtStrategyService {
    validate(request: FastifyRequest) {
      const tenantId = (request.headers['x-tenant-id'] as string) ?? 'tenant-1';
      const clientId = (request.headers['x-client-id'] as string) ?? 'client-1';
      return {
        claim: {
          tenantId,
          clientId,
        },
        isValid: true,
      };
    }
  }

  @Injectable()
  class ConfigService {
    get(_key: string) {
      return 'config-value';
    }
  }

  @Injectable()
  class InflightGate {
    private arrivalCount = 0;
    private released = false;
    private waitingResolver?: () => void;

    async waitForOverlap() {
      if (this.released) {
        return;
      }
      this.arrivalCount++;
      if (this.arrivalCount === 1) {
        await new Promise<void>(resolve => {
          this.waitingResolver = resolve;
        });
        return;
      }
      this.released = true;
      this.waitingResolver?.();
      this.waitingResolver = undefined;
    }
  }

  const AuthenticatedTenantProvider = {
    provide: AuthenticatedTenant,
    inject: [JwtStrategyService, REQUEST, ConfigService],
    scope: Scope.REQUEST,
    useFactory: async (
      strategy: JwtStrategyService,
      request: FastifyRequest,
      _config: ConfigService,
    ) => {
      const verification = strategy.validate(request);

      return new AuthenticatedTenant(
        verification.claim.tenantId,
        verification.claim.clientId,
      );
    },
  };

  @Injectable({ scope: Scope.REQUEST })
  class ActorService {
    constructor(@Inject(REQUEST) private readonly request: FastifyRequest) {}

    public getActor() {
      return (this.request.headers['x-actor-id'] as string) ?? 'system';
    }
  }

  @Module({
    providers: [JwtStrategyService, ConfigService, AuthenticatedTenantProvider],
    exports: [AuthenticatedTenant],
  })
  class AuthModule {}

  @Module({
    providers: [ActorService],
    exports: [ActorService],
  })
  class ActorModule {}

  @Controller()
  class TestController {
    constructor(
      @Inject(REQUEST_SCOPED_FACTORY)
      private readonly requestScopedFactory: {
        actorId: string;
        tenantId: string;
      },
    ) {}

    @Get('/posts')
    public getValue() {
      return this.requestScopedFactory;
    }
  }

  @Module({
    imports: [AuthModule, ActorModule],
    controllers: [TestController],
    providers: [
      InflightGate,
      {
        provide: REQUEST_SCOPED_FACTORY,
        scope: Scope.REQUEST,
        inject: [AuthenticatedTenant, ActorService, InflightGate],
        useFactory: async (
          authenticatedTenant: AuthenticatedTenant,
          actorService: ActorService,
          inflightGate: InflightGate,
        ) => {
          await inflightGate.waitForOverlap();

          return {
            actorId: actorService.getActor() ?? '',
            tenantId: authenticatedTenant.tenantName,
          };
        },
      },
    ],
  })
  class TestModule {}

  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    app.useGlobalFilters(new RecordingFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should resolve all injected dependencies across overlapping requests', async function () {
    this.timeout(20000);
    const responses = await Promise.all(
      Array.from({ length: REQUEST_COUNT }, (_, index) =>
        app.inject({
          method: 'GET',
          url: '/posts',
          headers: {
            'x-actor-id': `actor-${index}`,
            'x-client-id': `client-${index}`,
            'x-tenant-id': `tenant-${index}`,
          },
        }),
      ),
    );

    const failures = responses.flatMap((response, index) => {
      if (response.statusCode !== 200) {
        return [
          {
            body: response.body,
            index,
            statusCode: response.statusCode,
          },
        ];
      }
      return [];
    });

    expect(failures).to.deep.equal([]);

    const payloads = responses.map(response => JSON.parse(response.body));
    expect(payloads).to.deep.equal(
      Array.from({ length: REQUEST_COUNT }, (_, index) => ({
        actorId: `actor-${index}`,
        tenantId: `tenant-${index}`,
      })),
    );
  });
});
