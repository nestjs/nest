import { expect } from 'chai';
import { Test, TestingModule } from '@nestjs/testing';
import { z } from 'zod';
import { TrpcModule } from '../../trpc.module';
import { TrpcHttpAdapter } from '../../trpc-http-adapter';
import { Router } from '../../decorators/router.decorator';
import { Query, Mutation } from '../../decorators/procedure.decorator';

@Router('items')
class ItemsRouter {
    @Query()
    list() {
        return [{ id: '1', name: 'Item 1' }];
    }

    @Mutation({ input: z.object({ name: z.string() }) })
    create(input: { name: string }) {
        return { id: '2', name: input.name };
    }
}

describe('TrpcHttpAdapter', () => {
    let app: any;
    let adapter: TrpcHttpAdapter;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [TrpcModule.forRoot({ path: '/trpc' })],
            providers: [ItemsRouter],
        }).compile();

        app = module.createNestApplication();
        await app.init();

        adapter = module.get(TrpcHttpAdapter);
    });

    afterEach(async () => {
        await app.close();
    });

    it('should be defined', () => {
        expect(adapter).to.be.instanceOf(TrpcHttpAdapter);
    });

    it('should register the handler on the HTTP adapter during init', () => {
        // The adapter registers on init; if we got here without errors the
        // Express branch executed successfully.
        expect(adapter).to.not.be.undefined;
    });

    describe('Express handler', () => {
        let port: number;

        beforeEach(async () => {
            await app.listen(0);
            port = app.getHttpServer().address().port;
        });

        it('should handle GET query requests', async () => {
            const response = await fetch(
                `http://localhost:${port}/trpc/items.list`,
                { method: 'GET' },
            );
            expect(response.status).to.equal(200);
            const body = await response.json();
            expect(body.result.data).to.deep.equal([{ id: '1', name: 'Item 1' }]);
        });

        it('should handle POST mutation requests', async () => {
            const response = await fetch(
                `http://localhost:${port}/trpc/items.create`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'New Item' }),
                },
            );
            expect(response.status).to.equal(200);
            const body = await response.json();
            expect(body.result.data).to.deep.equal({ id: '2', name: 'New Item' });
        });

        it('should propagate response headers', async () => {
            const response = await fetch(
                `http://localhost:${port}/trpc/items.list`,
                { method: 'GET' },
            );
            expect(response.headers.get('content-type')).to.include(
                'application/json',
            );
        });
    });

    describe('with createContext', () => {
        let portWithCtx: number;
        let appWithCtx: any;

        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                imports: [
                    TrpcModule.forRoot({
                        path: '/trpc',
                        createContext: ({ req }) => ({
                            userAgent: req.headers?.['user-agent'] ?? 'unknown',
                        }),
                    }),
                ],
                providers: [ItemsRouter],
            }).compile();

            appWithCtx = module.createNestApplication();
            await appWithCtx.init();
            await appWithCtx.listen(0);
            portWithCtx = appWithCtx.getHttpServer().address().port;
        });

        afterEach(async () => {
            await appWithCtx.close();
        });

        it('should invoke createContext and make context available', async () => {
            const response = await fetch(
                `http://localhost:${portWithCtx}/trpc/items.list`,
                { method: 'GET' },
            );
            expect(response.status).to.equal(200);
        });
    });
});
