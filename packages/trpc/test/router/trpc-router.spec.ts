import { expect } from 'chai';
import { Test, TestingModule } from '@nestjs/testing';
import { z } from 'zod';
import { TrpcModule } from '../../trpc.module';
import { TrpcRouter } from '../../trpc-router';
import { Router } from '../../decorators/router.decorator';
import { Query, Mutation } from '../../decorators/procedure.decorator';

@Router('greeting')
class GreetingRouter {
    @Query({ input: z.object({ name: z.string() }) })
    hello(input: { name: string }) {
        return `Hello, ${input.name}!`;
    }

    @Mutation({ input: z.object({ name: z.string() }) })
    create(input: { name: string }) {
        return { id: '1', name: input.name };
    }
}

@Router()
class FlatRouter {
    @Query()
    ping() {
        return 'pong';
    }
}

describe('TrpcRouter', () => {
    let trpcRouter: TrpcRouter;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [TrpcModule.forRoot({ path: '/trpc' })],
            providers: [GreetingRouter, FlatRouter],
        }).compile();

        await module.init();

        trpcRouter = module.get(TrpcRouter);
    });

    it('should build a router from decorated providers', () => {
        const router = trpcRouter.getRouter();
        expect(router).to.not.be.undefined;
        expect(router._def).to.not.be.undefined;
    });

    it('should register nested procedures under the alias key', () => {
        const router = trpcRouter.getRouter();
        const procedures = router._def.procedures;
        expect(procedures).to.have.property('greeting.hello');
        expect(procedures).to.have.property('greeting.create');
    });

    it('should register flat procedures at the root level', () => {
        const router = trpcRouter.getRouter();
        const procedures = router._def.procedures;
        expect(procedures).to.have.property('ping');
    });

    it('should call aliased query handler and return correct output', async () => {
        const router = trpcRouter.getRouter();
        const caller = router.createCaller({});
        const result = await (caller as any).greeting.hello({ name: 'World' });
        expect(result).to.equal('Hello, World!');
    });

    it('should call aliased mutation handler and return correct output', async () => {
        const router = trpcRouter.getRouter();
        const caller = router.createCaller({});
        const result = await (caller as any).greeting.create({ name: 'Alice' });
        expect(result).to.deep.equal({ id: '1', name: 'Alice' });
    });

    it('should call flat query handler and return correct output', async () => {
        const router = trpcRouter.getRouter();
        const caller = router.createCaller({});
        const result = await (caller as any).ping();
        expect(result).to.equal('pong');
    });
});
