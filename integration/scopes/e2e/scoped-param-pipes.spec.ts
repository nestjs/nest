import {
  Controller,
  createParamDecorator,
  ExecutionContext,
  Inject,
  Injectable,
  INestApplication,
  INestMicroservice,
  Module,
  PipeTransform,
  Scope,
  Type,
  UsePipes,
} from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  CONTEXT,
  MessagePattern,
  MicroserviceOptions,
  Payload,
  RequestContext,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { firstValueFrom } from 'rxjs';
import { io, Socket } from 'socket.io-client';

const TCP_PORT = 3794;
const TRANSIENT_TCP_PORT = 3795;

@Injectable({ scope: Scope.REQUEST })
class Seen {
  static n = 0;
  readonly id = ++Seen.n;
}

@Injectable({ scope: Scope.REQUEST })
class CountingPipe implements PipeTransform {
  static n = 0;
  readonly id = ++CountingPipe.n;
  hits = 0;

  constructor(
    @Inject(CONTEXT) private readonly ctx: RequestContext,
    private readonly seen: Seen,
  ) {}

  transform(value: { label: string }) {
    return {
      label: value.label,
      pipeId: this.id,
      hits: ++this.hits,
      seenId: this.seen?.id,
      data: this.ctx?.getData(),
    };
  }
}

@Injectable({ scope: Scope.REQUEST })
class RejectingPipe implements PipeTransform {
  // An instance property, so a pipe whose constructor never ran has none.
  transform = (value: { ok: boolean }) => {
    if (!value.ok) {
      throw new RpcException('rejected');
    }
    return value;
  };
}

@Injectable()
class SuffixPipe implements PipeTransform {
  static n = 0;

  constructor() {
    SuffixPipe.n++;
  }

  transform(value: { label: string }) {
    return { label: value.label, suffix: 'ok' };
  }
}

const instancePipe = {
  hits: 0,
  transform(value: { label: string }) {
    return { label: value.label, inst: ++this.hits };
  },
};

@Injectable({ scope: Scope.REQUEST })
class MethodPipe implements PipeTransform {
  static n = 0;
  readonly id = ++MethodPipe.n;

  constructor(@Inject(CONTEXT) private readonly ctx: RequestContext) {}

  transform(value: { label: string }) {
    return { label: value.label, methodId: this.id, data: this.ctx.getData() };
  }
}

const Label = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToRpc().getData<{ label: string }>().label,
);

@Injectable({ scope: Scope.REQUEST })
class PatternPipe implements PipeTransform {
  static n = 0;
  readonly id = ++PatternPipe.n;

  constructor(@Inject(CONTEXT) private readonly ctx: RequestContext) {}

  transform(label: string) {
    return { label, pipeId: this.id, pattern: this.ctx?.getPattern() };
  }
}

let releaseGate: () => void;
let markEntered: () => void;
let gate: Promise<void>;
let entered: Promise<void>;

@Injectable({ scope: Scope.REQUEST })
class GatedPipe implements PipeTransform {
  static n = 0;
  readonly id = ++GatedPipe.n;

  constructor(@Inject(CONTEXT) private readonly ctx: RequestContext) {}

  async transform(value: { label: string }) {
    if (value.label === 'hold') {
      markEntered();
      await gate;
    }
    return { label: value.label, pipeId: this.id, data: this.ctx?.getData() };
  }
}

@Injectable({ scope: Scope.TRANSIENT })
class TransientPipe implements PipeTransform {
  static n = 0;
  readonly id = ++TransientPipe.n;
  hits = 0;

  transform(value: { label: string }) {
    return { label: value.label, pipeId: this.id, hits: ++this.hits };
  }
}

@Controller()
class RpcController {
  @MessagePattern('count')
  count(@Payload(CountingPipe) data: unknown) {
    return data;
  }

  @MessagePattern('count-again')
  countAgain(@Payload(CountingPipe) data: unknown) {
    return data;
  }

  @MessagePattern('checked')
  checked(@Payload(RejectingPipe) data: unknown) {
    return data;
  }

  @MessagePattern('suffix')
  suffix(@Payload(SuffixPipe) data: unknown) {
    return data;
  }

  @MessagePattern('instance')
  instance(@Payload(instancePipe) data: unknown) {
    return data;
  }

  @UsePipes(MethodPipe)
  @MessagePattern('method')
  method(@Payload() data: unknown) {
    return data;
  }

  @MessagePattern('gated')
  gated(@Payload(GatedPipe) data: unknown) {
    return data;
  }

  @MessagePattern('custom')
  custom(@Label(undefined, PatternPipe) data: unknown) {
    return data;
  }
}

@Controller()
class TransientController {
  @MessagePattern('transient')
  transient(@Payload(TransientPipe) data: unknown) {
    return data;
  }
}

@Module({ controllers: [RpcController], providers: [Seen] })
class RpcModule {}

@Module({ controllers: [TransientController] })
class TransientModule {}

@WebSocketGateway()
class TransientGateway {
  @SubscribeMessage('transient')
  transient(@MessageBody(TransientPipe) data: unknown) {
    return data;
  }
}

async function createTcpApp(module: Type<unknown>, port: number) {
  const moduleRef = await Test.createTestingModule({
    imports: [module],
  }).compile();
  const app = moduleRef.createNestMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port },
    logger: false,
  });
  await app.listen();
  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port },
  });
  await client.connect();
  return { app, client };
}

describe('Scoped parameter pipes', () => {
  const expectNumber = (value: unknown) => expect(value).to.be.a('number');

  describe('microservice', () => {
    let app: INestMicroservice;
    let client: ClientProxy;

    before(async () => {
      ({ app, client } = await createTcpApp(RpcModule, TCP_PORT));
    });

    after(async () => {
      await client?.close();
      await app?.close();
    });

    const send = (pattern: string, data: object): Promise<any> =>
      firstValueFrom(client.send(pattern, data));

    it('should build a request-scoped @Payload() pipe for each message', async () => {
      const first = await send('count', { label: 'one' });
      const second = await send('count', { label: 'two' });

      expect(first).to.deep.equal({
        label: 'one',
        pipeId: first.pipeId,
        hits: 1,
        seenId: first.seenId,
        data: { label: 'one' },
      });
      expect(second).to.deep.equal({
        label: 'two',
        pipeId: second.pipeId,
        hits: 1,
        seenId: second.seenId,
        data: { label: 'two' },
      });
      [first.pipeId, first.seenId, second.pipeId, second.seenId].forEach(
        expectNumber,
      );
      expect(second.pipeId).not.to.equal(first.pipeId);
      expect(second.seenId).not.to.equal(first.seenId);
    });

    it('should not share a request-scoped pipe between handlers', async () => {
      const first = await send('count', { label: 'one' });
      const other = await send('count-again', { label: 'two' });

      expect(other).to.deep.include({ hits: 1, data: { label: 'two' } });
      expect(other.pipeId).not.to.equal(first.pipeId);
    });

    it('should run a request-scoped pipe whose transform is an instance property', async () => {
      let error: any;
      await send('checked', { ok: false }).catch(err => (error = err));
      expect(error).to.deep.include({ message: 'rejected' });
      expect(await send('checked', { ok: true })).to.deep.equal({
        ok: true,
      });
    });

    it('should keep request-scoped pipes of overlapping messages apart', async () => {
      gate = new Promise(resolve => (releaseGate = resolve));
      entered = new Promise(resolve => (markEntered = resolve));

      const held = send('gated', { label: 'hold' });
      await entered;
      const next = await send('gated', { label: 'next' });
      releaseGate();
      const first = await held;

      expect(first).to.deep.equal({
        label: 'hold',
        pipeId: first.pipeId,
        data: { label: 'hold' },
      });
      expect(next).to.deep.equal({
        label: 'next',
        pipeId: next.pipeId,
        data: { label: 'next' },
      });
      [first.pipeId, next.pipeId].forEach(expectNumber);
      expect(next.pipeId).not.to.equal(first.pipeId);
    });

    it('should build a request-scoped pipe of a custom decorator for each message', async () => {
      const first = await send('custom', { label: 'one' });
      const second = await send('custom', { label: 'two' });

      expect(first).to.deep.equal({
        label: 'one',
        pipeId: first.pipeId,
        pattern: 'custom',
      });
      expect(second).to.deep.equal({
        label: 'two',
        pipeId: second.pipeId,
        pattern: 'custom',
      });
      [first.pipeId, second.pipeId].forEach(expectNumber);
      expect(second.pipeId).not.to.equal(first.pipeId);
    });

    it('should construct a default-scoped class pipe once', async () => {
      expect(await send('suffix', { label: 'one' })).to.deep.equal({
        label: 'one',
        suffix: 'ok',
      });
      expect(await send('suffix', { label: 'two' })).to.deep.equal({
        label: 'two',
        suffix: 'ok',
      });
      expect(SuffixPipe.n).to.equal(1);
    });

    it('should use a pipe instance as passed', async () => {
      expect(await send('instance', { label: 'one' })).to.deep.equal({
        label: 'one',
        inst: 1,
      });
      expect(await send('instance', { label: 'two' })).to.deep.equal({
        label: 'two',
        inst: 2,
      });
    });

    it('should build a request-scoped @UsePipes() pipe for each message', async () => {
      const first = await send('method', { label: 'one' });
      const second = await send('method', { label: 'two' });

      expect(first.data).to.deep.equal({ label: 'one' });
      expect(second.data).to.deep.equal({ label: 'two' });
      expect(second.methodId).not.to.equal(first.methodId);
    });
  });

  describe('transient pipe on a static controller', () => {
    let app: INestMicroservice;
    let client: ClientProxy;

    before(async () => {
      ({ app, client } = await createTcpApp(
        TransientModule,
        TRANSIENT_TCP_PORT,
      ));
    });

    after(async () => {
      await client?.close();
      await app?.close();
    });

    it('should use the instance created for that controller', async () => {
      const first = await firstValueFrom(
        client.send<any>('transient', { label: 'one' }),
      );
      const second = await firstValueFrom(
        client.send<any>('transient', { label: 'two' }),
      );

      expect(first).to.deep.equal({
        label: 'one',
        pipeId: first.pipeId,
        hits: 1,
      });
      expectNumber(first.pipeId);
      expect(second).to.deep.equal({
        label: 'two',
        pipeId: first.pipeId,
        hits: 2,
      });
    });
  });

  describe('gateway', () => {
    let app: INestApplication;
    const sockets: Socket[] = [];

    before(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [TransientGateway],
      }).compile();
      app = moduleRef.createNestApplication({ logger: false });
      await app.listen(0, '127.0.0.1');
    });

    after(async () => {
      sockets.forEach(socket => socket.disconnect());
      await app?.close();
    });

    const connect = async () => {
      const socket = io(await app.getUrl(), {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
      });
      sockets.push(socket);
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', () => resolve());
        socket.once('connect_error', reject);
      });
      return socket;
    };

    const emit = (socket: Socket, event: string, label: string) =>
      socket.timeout(2000).emitWithAck(event, { label });

    it('should use the transient pipe created for a static gateway', async () => {
      const first = await emit(await connect(), 'transient', 'a');
      const second = await emit(await connect(), 'transient', 'b');

      expect(first).to.deep.equal({
        label: 'a',
        pipeId: first.pipeId,
        hits: 1,
      });
      expectNumber(first.pipeId);
      expect(second).to.deep.equal({
        label: 'b',
        pipeId: first.pipeId,
        hits: 2,
      });
    });
  });
});
