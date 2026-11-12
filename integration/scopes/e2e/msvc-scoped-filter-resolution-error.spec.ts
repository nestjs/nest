import {
  Catch,
  Controller,
  ExceptionFilter,
  Inject,
  Injectable,
  INestMicroservice,
  Provider,
  Scope,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import {
  ClientTCP,
  CONTEXT,
  MessagePattern,
  MicroserviceOptions,
  RequestContext,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as net from 'net';
import { firstValueFrom, throwError, timeout } from 'rxjs';

const FILTERED = { status: 'error', message: 'filtered' };

const schemaOf = (tenant: string) => {
  if (tenant !== 'known') {
    throw new RpcException(`no schema for tenant "${tenant}"`);
  }
  return `${tenant}_schema`;
};

// Fails to resolve for an unknown tenant, before any handler runs
@Injectable({ scope: Scope.REQUEST })
class TenantSchema {
  public readonly name: string;

  constructor(@Inject(CONTEXT) ctx: RequestContext<{ tenant: string }>) {
    this.name = schemaOf(ctx.data.tenant);
  }
}

@Catch()
class OpaqueFilter implements ExceptionFilter {
  static caught = 0;

  catch() {
    OpaqueFilter.caught++;
    return throwError(() => FILTERED);
  }
}

// Depends on what fails to resolve, so it cannot be created either
@Catch()
@Injectable({ scope: Scope.REQUEST })
class DependentFilter implements ExceptionFilter {
  constructor(private readonly schema: TenantSchema) {}

  catch() {
    return throwError(() => ({ status: 'error', message: this.schema.name }));
  }
}

@Controller()
class ReportsController {
  constructor(private readonly schema: TenantSchema) {}

  @MessagePattern('reports.get')
  get() {
    return this.schema.name;
  }
}

@Controller()
class ExportsController {
  @MessagePattern('exports.get')
  get(data: { tenant: string }) {
    return schemaOf(data.tenant);
  }
}

describe('Scoped exception filters for a controller that fails to resolve (microservices)', () => {
  let app: INestMicroservice;
  let client: ClientTCP;

  afterEach(async () => {
    await client?.close();
    await app?.close();
  });

  async function start(filter: Provider) {
    OpaqueFilter.caught = 0;
    const module = await Test.createTestingModule({
      controllers: [ReportsController, ExportsController],
      providers: [TenantSchema, filter],
    }).compile();
    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 0 },
    });
    app.useLogger(false);
    await app.listen();
    const { port } = app.unwrap<net.Server>().address() as net.AddressInfo;
    client = new ClientTCP({ host: '127.0.0.1', port });
    await client.connect();
  }

  function call(pattern: string, tenant: string) {
    return firstValueFrom(client.send(pattern, { tenant }).pipe(timeout(2000)));
  }

  it.each([
    ['DEFAULT', Scope.DEFAULT],
    ['REQUEST', Scope.REQUEST],
    ['TRANSIENT', Scope.TRANSIENT],
  ])(
    'should apply a global filter of scope %s to the error of a failing provider',
    async (_, scope) => {
      await start({ provide: APP_FILTER, useClass: OpaqueFilter, scope });

      await expect(call('reports.get', 'known')).resolves.toBe('known_schema');
      await expect(call('exports.get', 'unknown')).rejects.toEqual(FILTERED);
      await expect(call('reports.get', 'unknown')).rejects.toEqual(FILTERED);
      expect(OpaqueFilter.caught).toBe(2);
    },
  );

  it('should leave the error to the default filter when the filter fails to resolve too', async () => {
    // The filter needs what failed to resolve
    await start({ provide: APP_FILTER, useClass: DependentFilter });

    await expect(call('reports.get', 'known')).resolves.toBe('known_schema');
    await expect(call('reports.get', 'unknown')).rejects.toEqual({
      status: 'error',
      message: 'no schema for tenant "unknown"',
    });
  });
});
