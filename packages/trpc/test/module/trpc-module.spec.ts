import { expect } from 'chai';
import { Test, TestingModule } from '@nestjs/testing';
import { TrpcModule } from '../../trpc.module';
import { TrpcRouter } from '../../trpc-router';
import { TRPC_MODULE_OPTIONS } from '../../constants';

describe('TrpcModule', () => {
  describe('forRoot', () => {
    it('should provide TrpcRouter', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [TrpcModule.forRoot({ path: '/trpc' })],
      }).compile();

      const router = module.get(TrpcRouter);
      expect(router).to.be.instanceOf(TrpcRouter);
    });

    it('should use default options', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [TrpcModule.forRoot()],
      }).compile();

      const options = module.get(TRPC_MODULE_OPTIONS);
      expect(options).to.deep.equal({});
    });

    it('should provide custom options', async () => {
      const opts = { path: '/api/trpc' };
      const module: TestingModule = await Test.createTestingModule({
        imports: [TrpcModule.forRoot(opts)],
      }).compile();

      const options = module.get(TRPC_MODULE_OPTIONS);
      expect(options).to.deep.equal(opts);
    });
  });

  describe('forRootAsync', () => {
    it('should provide TrpcRouter with async options', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          TrpcModule.forRootAsync({
            useFactory: () => ({ path: '/trpc' }),
          }),
        ],
      }).compile();

      const router = module.get(TrpcRouter);
      expect(router).to.be.instanceOf(TrpcRouter);

      const options = module.get(TRPC_MODULE_OPTIONS);
      expect(options).to.deep.equal({ path: '/trpc' });
    });
  });
});
