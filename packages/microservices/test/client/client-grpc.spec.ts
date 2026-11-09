import { Metadata } from '@grpc/grpc-js';
import { Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { join } from 'path';
import { lastValueFrom, Observable, Subject, throwError } from 'rxjs';
import { ClientGrpcProxy } from '../../client/index.js';
import { ReadPacket } from '../../interfaces/index.js';
import { InvalidGrpcPackageException } from '../../errors/invalid-grpc-package.exception.js';
import { InvalidGrpcServiceException } from '../../errors/invalid-grpc-service.exception.js';
import { InvalidProtoDefinitionException } from '../../errors/invalid-proto-definition.exception.js';

class NoopLogger extends Logger {
  log(message: any, context?: string): void {}
  error(message: any, trace?: string, context?: string): void {}
  warn(message: any, context?: string): void {}
}

class GrpcService {
  test = null;
  test2 = null;
}

describe('ClientGrpcProxy', () => {
  let client: ClientGrpcProxy;
  let untypedClient: any;
  let clientMulti: ClientGrpcProxy;

  beforeEach(() => {
    client = new ClientGrpcProxy({
      protoPath: join(import.meta.dirname, './test.proto'),
      package: 'test',
    });
    untypedClient = client as any;

    clientMulti = new ClientGrpcProxy({
      protoPath: ['test.proto', 'test2.proto'],
      package: ['test', 'test2'],
      loader: {
        includeDirs: [join(import.meta.dirname, '.')],
      },
    });
  });

  describe('getService', () => {
    describe('when "grpcClient[name]" is nil', () => {
      it('should throw "InvalidGrpcServiceException"', () => {
        untypedClient.grpcClient = {};
        expect(() => client.getService('test')).toThrow(
          InvalidGrpcServiceException,
        );
      });

      it('should throw "InvalidGrpcServiceException" (multiple proto)', () => {
        (clientMulti as any).grpcClient = {};

        expect(() => clientMulti.getService('test')).toThrow(
          InvalidGrpcServiceException,
        );

        expect(() => clientMulti.getService('test2')).toThrow(
          InvalidGrpcServiceException,
        );
      });
    });
    describe('when "grpcClient[name]" is not nil', () => {
      it('should create grpcService', async () => {
        untypedClient.grpcClients[0] = {
          test: GrpcService,
        };
        client.getService('test'); // should not throw
      });

      describe('when "grpcClient[name]" is not nil (multiple proto)', () => {
        it('should create grpcService', async () => {
          (clientMulti as any).grpcClients[0] = {
            test: GrpcService,
            test2: GrpcService,
          };
          clientMulti.getService('test'); // should not throw
          clientMulti.getService('test2'); // should not throw
        });
      });
    });
  });

  describe('createServiceMethod', () => {
    const methodName = 'test';
    describe('when method is a response stream', () => {
      it('should call "createStreamServiceMethod"', () => {
        const cln = { [methodName]: { responseStream: true } };
        const spy = vi.spyOn(client, 'createStreamServiceMethod');
        client.createServiceMethod(cln, methodName);

        expect(spy).toHaveBeenCalled();
      });
    });
    describe('when method is not a response stream', () => {
      it('should call "createUnaryServiceMethod"', () => {
        const cln = { [methodName]: { responseStream: false } };
        const spy = vi.spyOn(client, 'createUnaryServiceMethod');
        client.createServiceMethod(cln, methodName);

        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe('createStreamServiceMethod', () => {
    it('should return observable', () => {
      const methodKey = 'method';
      const fn = client.createStreamServiceMethod(
        { [methodKey]: {} },
        methodKey,
      );
      expect(fn()).toBeInstanceOf(Observable);
    });
    describe('on subscribe', () => {
      const methodName = 'm';
      const obj = { [methodName]: () => ({ on: (type, fn) => fn() }) };

      let stream$: Observable<any>;

      beforeEach(() => {
        stream$ = client.createStreamServiceMethod(obj, methodName)();
      });

      it('should call native method', () => {
        const spy = vi.spyOn(obj, methodName);
        stream$.subscribe({
          next: () => ({}),
          error: () => ({}),
        });

        expect(spy).toHaveBeenCalled();
      });
    });

    describe('when stream request', () => {
      const methodName = 'm';
      const writeSpy = vi.fn();
      const obj = {
        [methodName]: () => ({ on: (type, fn) => fn(), write: writeSpy }),
      };

      let stream$: Observable<any>;
      let upstream: Subject<unknown>;

      beforeEach(() => {
        upstream = new Subject();
        (obj[methodName] as any).requestStream = true;
        stream$ = client.createStreamServiceMethod(obj, methodName)(upstream);
      });

      it('should subscribe to request upstream', () => {
        const upstreamSubscribe = vi.spyOn(upstream, 'subscribe');
        stream$.subscribe({
          next: () => ({}),
          error: () => ({}),
        });
        upstream.next({ test: true });

        expect(writeSpy).toHaveBeenCalled();
        expect(upstreamSubscribe).toHaveBeenCalled();
      });
    });

    describe('flow-control', () => {
      const methodName = 'm';
      type EvtCallback = (...args: any[]) => void;
      let callMock: {
        on: (type: string, fn: EvtCallback) => void;
        cancel: ReturnType<typeof vi.fn>;
        finished: boolean;
        destroy: ReturnType<typeof vi.fn>;
        removeAllListeners: ReturnType<typeof vi.fn>;
      };
      let eventCallbacks: { [type: string]: EvtCallback };
      let obj, dataSpy, errorSpy, completeSpy;

      let stream$: Observable<any>;

      beforeEach(() => {
        dataSpy = vi.fn();
        errorSpy = vi.fn();
        completeSpy = vi.fn();

        eventCallbacks = {};
        callMock = {
          on: (type, fn) => (eventCallbacks[type] = fn),
          cancel: vi.fn(),
          finished: false,
          destroy: vi.fn(),
          removeAllListeners: vi.fn(),
        };
        obj = { [methodName]: () => callMock };
        stream$ = client.createStreamServiceMethod(obj, methodName)();
      });

      it('propagates server errors', () => {
        const err = new Error('something happened');
        stream$.subscribe({
          next: dataSpy,
          error: errorSpy,
          complete: completeSpy,
        });

        eventCallbacks.data('a');
        eventCallbacks.data('b');
        callMock.finished = true;
        eventCallbacks.error(err);
        eventCallbacks.data('c');

        expect(Object.keys(eventCallbacks).length).toBe(3);
        expect(dataSpy.mock.calls).toEqual([['a'], ['b']]);
        expect(errorSpy.mock.calls[0][0]).toEqual(err);
        expect(completeSpy).not.toHaveBeenCalled();
        expect(callMock.cancel).not.toHaveBeenCalled();
      });

      it('handles client side cancel', () => {
        const grpcServerCancelErrMock = {
          details: 'Cancelled',
        };
        const subscription = stream$.subscribe({
          next: dataSpy,
          error: errorSpy,
        });

        eventCallbacks.data('a');
        eventCallbacks.data('b');
        subscription.unsubscribe();
        eventCallbacks.error(grpcServerCancelErrMock);
        eventCallbacks.end();
        eventCallbacks.data('c');

        expect(callMock.cancel).toHaveBeenCalled();
        expect(callMock.destroy).toHaveBeenCalled();
        expect(dataSpy.mock.calls).toEqual([['a'], ['b']]);
        expect(errorSpy).not.toHaveBeenCalled();
      });

      it('forwards an upstream error raised while subscribing and cancels the call', () => {
        const upstreamError = new Error('upstream error');
        // Like a grpc-js call, throws on an "error" event nobody listens to
        const duplexCall = Object.assign(new EventEmitter(), {
          write: vi.fn(),
          end: vi.fn(),
          cancel: vi.fn(),
          finished: false,
        });
        const duplexObj = {
          [methodName]: Object.assign(() => duplexCall, {
            requestStream: true,
          }),
        };

        client
          .createStreamServiceMethod(
            duplexObj,
            methodName,
          )(throwError(() => upstreamError))
          .subscribe({ error: errorSpy });

        expect(errorSpy).toHaveBeenCalledExactlyOnceWith(upstreamError);
        expect(duplexCall.cancel).toHaveBeenCalled();
      });
    });
  });

  describe('createUnaryServiceMethod', () => {
    it('should return observable', () => {
      const methodKey = 'method';
      const fn = client.createUnaryServiceMethod(
        { [methodKey]: {} },
        methodKey,
      );
      expect(fn()).toBeInstanceOf(Observable);
    });
    describe('on subscribe', () => {
      const methodName = 'm';
      const obj = {
        [methodName]: callback => {
          callback(null, {});

          return {
            finished: true,
          };
        },
      };

      let stream$: Observable<any>;

      beforeEach(() => {
        stream$ = client.createUnaryServiceMethod(obj, methodName)();
      });

      it('should call native method', () => {
        const spy = vi.spyOn(obj, methodName);
        stream$.subscribe({
          next: () => ({}),
          error: () => ({}),
        });

        expect(spy).toHaveBeenCalled();
      });
    });
    describe('when stream request', () => {
      let clientCallback: (
        err: Error | null | undefined,
        response: any,
      ) => void;
      const writeSpy = vi.fn();
      const methodName = 'm';

      const callMock = {
        cancel: vi.fn(),
        finished: false,
        write: writeSpy,
      };

      const obj = {
        [methodName]: callback => {
          clientCallback = callback;
          return callMock;
        },
      };

      let stream$: Observable<any>;
      let upstream: Subject<unknown>;

      beforeEach(() => {
        upstream = new Subject();
        (obj[methodName] as any).requestStream = true;
        stream$ = client.createUnaryServiceMethod(obj, methodName)(upstream);
      });

      afterEach(() => {
        clientCallback(null, {});
      });

      it('should subscribe to request upstream', () => {
        const upstreamSubscribe = vi.spyOn(upstream, 'subscribe');
        stream$.subscribe({
          next: () => ({}),
          error: () => ({}),
        });
        upstream.next({ test: true });

        expect(writeSpy).toHaveBeenCalled();
        expect(upstreamSubscribe).toHaveBeenCalled();
      });
    });

    describe('flow-control', () => {
      it('should cancel call on client unsubscribe', () => {
        const methodName = 'm';

        const dataSpy = vi.fn();
        const errorSpy = vi.fn();
        const completeSpy = vi.fn();

        const callMock = {
          cancel: vi.fn(),
          finished: false,
        };

        let handler: (error: any, data: any) => void;

        const obj = {
          [methodName]: (callback, ...args) => {
            handler = callback;

            return callMock;
          },
        };

        const stream$ = client.createUnaryServiceMethod(obj, methodName)();

        const subscription = stream$.subscribe({
          next: dataSpy,
          error: errorSpy,
          complete: completeSpy,
        });

        subscription.unsubscribe();
        handler!(null, 'a');

        expect(dataSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        expect(completeSpy).not.toHaveBeenCalled();
        expect(callMock.cancel).toHaveBeenCalled();
      });

      it('should cancel call on client unsubscribe case client streaming', () => {
        const methodName = 'm';

        const dataSpy = vi.fn();
        const errorSpy = vi.fn();
        const completeSpy = vi.fn();
        const writeSpy = vi.fn();

        const callMock = {
          cancel: vi.fn(),
          finished: false,
          write: writeSpy,
        };

        let handler: (error: any, data: any) => void;
        const obj = {
          [methodName]: callback => {
            handler = callback;
            return callMock;
          },
        };

        (obj[methodName] as any).requestStream = true;
        const upstream: Subject<unknown> = new Subject();
        const stream$: Observable<any> = client.createUnaryServiceMethod(
          obj,
          methodName,
        )(upstream);

        const upstreamSubscribe = vi.spyOn(upstream, 'subscribe');
        stream$.subscribe({
          next: () => ({}),
          error: () => ({}),
        });
        upstream.next({ test: true });

        const subscription = stream$.subscribe({
          next: dataSpy,
          error: errorSpy,
          complete: completeSpy,
        });

        subscription.unsubscribe();
        handler!(null, 'a');

        expect(dataSpy).not.toHaveBeenCalled();
        expect(writeSpy).toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        expect(completeSpy).not.toHaveBeenCalled();
        expect(callMock.cancel).toHaveBeenCalled();
        expect(upstreamSubscribe).toHaveBeenCalled();
      });

      it('should forward upstream error and cancel call case client streaming', () => {
        const methodName = 'm';
        const upstreamError = new Error('upstream error');
        const errorSpy = vi.fn();

        const callMock = {
          cancel: vi.fn(),
          finished: false,
        };
        const obj = { [methodName]: () => callMock };

        (obj[methodName] as any).requestStream = true;
        const upstream: Subject<unknown> = new Subject();
        const stream$: Observable<any> = client.createUnaryServiceMethod(
          obj,
          methodName,
        )(upstream);

        stream$.subscribe({ error: errorSpy });
        upstream.error(upstreamError);

        expect(errorSpy).toHaveBeenCalledWith(upstreamError);
        expect(callMock.cancel).toHaveBeenCalled();
      });
    });
  });

  describe('dispatch hook', () => {
    const path = '/test.TestService/Find';
    const attachTraceId = (packet: ReadPacket) => {
      packet.metadata = { 'x-request-id': 'trace-1', tenant: 'acme' };
    };
    let unary: ReturnType<typeof vi.fn>;
    let grpcClient: Record<string, any>;

    const callArgs = () => unary.mock.calls[0].slice(0, -1);

    beforeEach(() => {
      unary = vi.fn((...args: any[]) => {
        args[args.length - 1](null, { ok: true });
        return { finished: true };
      });
      grpcClient = { find: Object.assign(unary, { path }) };
    });

    it('should run once per call, when subscribed, with the method path and the request', async () => {
      const hook = vi.fn(attachTraceId);
      client.setOnDispatchHook(hook);
      const find = client.createServiceMethod(grpcClient, 'find');

      const call$ = find({ id: 1 });
      expect(hook).not.toHaveBeenCalled();
      await lastValueFrom(call$);
      await lastValueFrom(call$);

      expect(hook).toHaveBeenCalledTimes(2);
      expect(hook.mock.calls[0][0]).toMatchObject({
        pattern: path,
        data: { id: 1 },
      });
    });

    it('should send the metadata it attached as call metadata', async () => {
      client.setOnDispatchHook(attachTraceId);

      await lastValueFrom(
        client.createServiceMethod(grpcClient, 'find')({ id: 1 }),
      );

      const [data, metadata] = callArgs();
      expect(data).toEqual({ id: 1 });
      expect(metadata).toBeInstanceOf(Metadata);
      expect(metadata.getMap()).toEqual({
        'x-request-id': 'trace-1',
        tenant: 'acme',
      });
    });

    it("should let the caller's metadata win, and leave the caller's Metadata unchanged", async () => {
      client.setOnDispatchHook(attachTraceId);
      const callerMetadata = new Metadata();
      callerMetadata.set('x-request-id', 'own-id');

      await lastValueFrom(
        client.createServiceMethod(grpcClient, 'find')(
          { id: 1 },
          callerMetadata,
        ),
      );

      const [, metadata] = callArgs();
      expect(metadata).not.toBe(callerMetadata);
      expect(metadata.get('x-request-id')).toEqual(['own-id']);
      expect(metadata.get('tenant')).toEqual(['acme']);
      expect(callerMetadata.getMap()).toEqual({ 'x-request-id': 'own-id' });
    });

    it('should keep call options passed in place of the metadata', async () => {
      client.setOnDispatchHook(attachTraceId);
      const options = { deadline: Date.now() + 1000 };

      await lastValueFrom(
        client.createServiceMethod(grpcClient, 'find')({ id: 1 }, options),
      );

      const [, metadata, callOptions] = callArgs();
      expect(metadata.get('x-request-id')).toEqual(['trace-1']);
      expect(callOptions).toBe(options);
    });

    it('should leave the arguments as they are without a hook or without metadata', async () => {
      await lastValueFrom(
        client.createServiceMethod(grpcClient, 'find')({ id: 1 }),
      );
      client.setOnDispatchHook(() => {});
      await lastValueFrom(
        client.createServiceMethod(grpcClient, 'find')({ id: 1 }),
      );

      expect(unary.mock.calls.map(args => args.slice(0, -1))).toEqual([
        [{ id: 1 }],
        [{ id: 1 }],
      ]);
    });

    it('should fail the call over a key gRPC cannot carry', async () => {
      client.setOnDispatchHook(packet => {
        packet.metadata = { 'not a key': 'value' };
      });

      await expect(
        lastValueFrom(client.createServiceMethod(grpcClient, 'find')({})),
      ).rejects.toThrow(/illegal characters/);
      expect(unary).not.toHaveBeenCalled();
    });

    it('should send the metadata with a response stream call', () => {
      client.setOnDispatchHook(attachTraceId);
      const serverStream = vi.fn(() => ({ on: vi.fn() }));
      Object.assign(serverStream, { path, responseStream: true });

      client
        .createServiceMethod(
          { list: serverStream },
          'list',
        )({ id: 1 })
        .subscribe();

      const [data, metadata] = serverStream.mock.calls[0] as any[];
      expect(data).toEqual({ id: 1 });
      expect(metadata.get('x-request-id')).toEqual(['trace-1']);
    });

    it('should send the metadata with a request stream call', () => {
      client.setOnDispatchHook(attachTraceId);
      const clientStream = vi.fn(() => ({ write: vi.fn(), end: vi.fn() }));
      Object.assign(clientStream, { path, requestStream: true });

      client
        .createServiceMethod(
          { sum: clientStream },
          'sum',
        )(new Subject())
        .subscribe();

      const [metadata, callback] = clientStream.mock.calls[0] as any[];
      expect(metadata.get('x-request-id')).toEqual(['trace-1']);
      expect(callback).toBeInstanceOf(Function);
    });

    describe('call options on request stream calls', () => {
      const options = { deadline: Date.now() + 1000 };
      const clientStreamMethod = () =>
        Object.assign(
          vi.fn(() => ({ write: vi.fn(), end: vi.fn() })),
          { path, requestStream: true },
        );
      const bidiMethod = () =>
        Object.assign(
          vi.fn(() => ({
            on: vi.fn(),
            write: vi.fn(),
            end: vi.fn(),
            cancel: vi.fn(),
            finished: false,
          })),
          { path, requestStream: true, responseStream: true },
        );
      const call = (method: ReturnType<typeof vi.fn>, ...args: unknown[]) =>
        client
          .createServiceMethod(
            { call: method },
            'call',
          )(...args)
          .subscribe();
      // The arguments a client stream call got, without its trailing callback
      const valuesBeforeCallback = (method: ReturnType<typeof vi.fn>) => {
        const args = method.mock.calls[0] as unknown[];
        expect(args[args.length - 1]).toBeInstanceOf(Function);
        return args.slice(0, -1);
      };

      it('should keep them when the hook inserts metadata', () => {
        client.setOnDispatchHook(attachTraceId);
        const clientStream = clientStreamMethod();
        const bidi = bidiMethod();

        call(clientStream, new Subject(), options);
        call(bidi, new Subject(), options);

        for (const [metadata, callOptions] of [
          valuesBeforeCallback(clientStream),
          bidi.mock.calls[0] as unknown[],
        ] as [Metadata, unknown][]) {
          expect(metadata.get('x-request-id')).toEqual(['trace-1']);
          expect(callOptions).toBe(options);
        }
      });

      it("should keep them after the caller's metadata", () => {
        const callerMetadata = new Metadata();
        const clientStream = clientStreamMethod();
        const bidi = bidiMethod();

        call(clientStream, new Subject(), callerMetadata, options);
        call(bidi, new Subject(), callerMetadata, options);

        expect(valuesBeforeCallback(clientStream)).toEqual([
          callerMetadata,
          options,
        ]);
        expect(bidi.mock.calls[0]).toEqual([callerMetadata, options]);
      });

      it("should keep them after the caller's metadata the hook merges into", () => {
        client.setOnDispatchHook(attachTraceId);
        const callerMetadata = new Metadata();
        callerMetadata.set('x-request-id', 'own-id');
        const clientStream = clientStreamMethod();
        const bidi = bidiMethod();

        call(clientStream, new Subject(), callerMetadata, options);
        call(bidi, new Subject(), callerMetadata, options);

        for (const [metadata, callOptions] of [
          valuesBeforeCallback(clientStream),
          bidi.mock.calls[0] as unknown[],
        ] as [Metadata, unknown][]) {
          expect(metadata).not.toBe(callerMetadata);
          expect(metadata.get('x-request-id')).toEqual(['own-id']);
          expect(metadata.get('tenant')).toEqual(['acme']);
          expect(callOptions).toBe(options);
        }
      });

      it('should keep them in place of the metadata without a hook', () => {
        const clientStream = clientStreamMethod();
        const bidi = bidiMethod();

        call(clientStream, new Subject(), options);
        call(bidi, new Subject(), options);

        expect(valuesBeforeCallback(clientStream)).toEqual([options]);
        expect(bidi.mock.calls[0]).toEqual([options]);
      });

      it('should leave out nil values, which grpc-js does not skip', () => {
        const callerMetadata = new Metadata();
        for (const missing of [undefined, null]) {
          const clientStream = clientStreamMethod();
          const bidi = bidiMethod();

          call(clientStream, new Subject(), missing, options);
          call(bidi, new Subject(), missing, options);

          expect(valuesBeforeCallback(clientStream)).toEqual([options]);
          expect(bidi.mock.calls[0]).toEqual([options]);
        }
        const clientStream = clientStreamMethod();
        const bidi = bidiMethod();
        call(clientStream, new Subject(), callerMetadata, undefined, options);
        call(bidi, new Subject(), callerMetadata, undefined, options);
        expect(valuesBeforeCallback(clientStream)).toEqual([
          callerMetadata,
          options,
        ]);
        expect(bidi.mock.calls[0]).toEqual([callerMetadata, options]);

        const withoutOptions = clientStreamMethod();
        call(withoutOptions, new Subject(), callerMetadata, undefined);
        expect(valuesBeforeCallback(withoutOptions)).toEqual([callerMetadata]);
      });

      it('should pass nothing else when only the upstream is given', () => {
        const clientStream = clientStreamMethod();
        const bidi = bidiMethod();

        call(clientStream, new Subject());
        call(bidi, new Subject());

        expect(valuesBeforeCallback(clientStream)).toEqual([]);
        expect(bidi.mock.calls[0]).toEqual([]);
      });
    });

    it('should keep call options on a response stream call when the hook inserts metadata', () => {
      client.setOnDispatchHook(attachTraceId);
      const options = { deadline: Date.now() + 1000 };
      const serverStream = vi.fn(() => ({ on: vi.fn() }));
      Object.assign(serverStream, { path, responseStream: true });

      client
        .createServiceMethod({ list: serverStream }, 'list')({ id: 1 }, options)
        .subscribe();

      const [data, metadata, callOptions] = serverStream.mock.calls[0] as any[];
      expect(data).toEqual({ id: 1 });
      expect(metadata.get('x-request-id')).toEqual(['trace-1']);
      expect(callOptions).toBe(options);
    });

    it('should leave out nil metadata and call options on unary and response stream calls, which grpc-js does not skip', async () => {
      const options = { deadline: Date.now() + 1000 };
      const serverStream = vi.fn(() => ({ on: vi.fn() }));
      Object.assign(serverStream, { path, responseStream: true });
      const find = client.createServiceMethod(grpcClient, 'find');
      const list = client.createServiceMethod({ list: serverStream }, 'list');

      for (const missing of [undefined, null]) {
        await lastValueFrom(find({ id: 1 }, missing, options));
        await lastValueFrom(find({ id: 1 }, missing));
        list({ id: 1 }, missing, options).subscribe();
      }
      const callerMetadata = new Metadata();
      await lastValueFrom(find({ id: 1 }, callerMetadata, undefined));

      expect(unary.mock.calls.map(args => args.slice(0, -1))).toEqual([
        [{ id: 1 }, options],
        [{ id: 1 }],
        [{ id: 1 }, options],
        [{ id: 1 }],
        [{ id: 1 }, callerMetadata],
      ]);
      expect(serverStream.mock.calls).toEqual([
        [{ id: 1 }, options],
        [{ id: 1 }, options],
      ]);
    });
  });

  describe('createClientByServiceName', () => {
    it('should not write the message size limits into the given "channelOptions"', () => {
      const shared = { channelOptions: { 'grpc.primary_user_agent': 'app' } };
      const protoPath = join(import.meta.dirname, './test.proto');
      const limited = new ClientGrpcProxy({
        ...shared,
        protoPath,
        package: 'test',
        maxReceiveMessageLength: 1024,
      });
      const unlimited = new ClientGrpcProxy({
        ...shared,
        protoPath,
        package: 'test',
      });
      const grpcClient = vi.fn();
      (limited as any).grpcClients = [{ test: grpcClient }];
      (unlimited as any).grpcClients = [{ test: grpcClient }];

      limited.createClientByServiceName('test');
      unlimited.createClientByServiceName('test');

      expect(shared.channelOptions).toEqual({
        'grpc.primary_user_agent': 'app',
      });
      expect(grpcClient.mock.calls[0][2]).toEqual({
        'grpc.primary_user_agent': 'app',
        'grpc.max_receive_message_length': 1024,
      });
      expect(grpcClient.mock.calls[1][2]).toEqual({
        'grpc.primary_user_agent': 'app',
      });
    });
  });

  describe('createClients', () => {
    describe('when package does not exist', () => {
      it('should throw "InvalidGrpcPackageException"', () => {
        vi.spyOn(client, 'lookupPackage').mockImplementation(() => null);
        untypedClient.logger = new NoopLogger();

        try {
          client.createClients();
        } catch (err) {
          expect(err).toBeInstanceOf(InvalidGrpcPackageException);
        }
      });
    });
  });

  describe('loadProto', () => {
    describe('when proto is invalid', () => {
      it('should throw InvalidProtoDefinitionException', () => {
        expect(
          () =>
            new ClientGrpcProxy({
              protoPath: '/nonexistent/invalid.proto',
              package: 'test',
            }),
        ).toThrow(InvalidProtoDefinitionException);
      });
    });
  });
  describe('close', () => {
    it('should call "close" method', () => {
      const grpcClient = { close: vi.fn() };
      untypedClient.clients.set('test', grpcClient);
      untypedClient.grpcClients[0] = {};

      client.close();
      expect(grpcClient.close).toHaveBeenCalled();
      expect(untypedClient.clients.size).toBe(0);
      expect(untypedClient.grpcClients.length).toBe(0);
    });
  });

  describe('publish', () => {
    it('should throw exception', () => {
      expect(() => client['publish'](null, null!)).toThrow(Error);
    });
  });

  describe('send', () => {
    it('should throw exception', () => {
      expect(() => client.send(null, null)).toThrow(Error);
    });
  });

  describe('connect', () => {
    it('should throw exception', () => {
      client.connect().catch(error => expect(error).toBeInstanceOf(Error));
    });
  });

  describe('dispatchEvent', () => {
    it('should throw exception', () => {
      client['dispatchEvent'](null).catch(error =>
        expect(error).toBeInstanceOf(Error),
      );
    });
  });

  describe('lookupPackage', () => {
    it('should return root package in case package name is not defined', () => {
      const root = {};

      expect(client.lookupPackage(root, undefined!)).toBe(root);
      expect(client.lookupPackage(root, '')).toBe(root);
    });

    it('should return nested package when fully resolvable', () => {
      const root = { a: { b: { service: {} } } };

      expect(client.lookupPackage(root, 'a.b.service')).toBe(root.a.b.service);
    });

    it('should return undefined when a namespace segment is missing', () => {
      const root = { a: { c: {} } };

      expect(client.lookupPackage(root, 'a.b.c')).toBeUndefined();
    });
  });
});
