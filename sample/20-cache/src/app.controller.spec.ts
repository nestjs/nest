import { vi } from 'vitest';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: CACHE_MANAGER,
          useValue: { get: vi.fn(), set: vi.fn() },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of items', async () => {
      vi.useFakeTimers();

      const promise = controller.findAll();
      vi.runAllTimers();
      const result = await promise;

      expect(result).toEqual([{ id: 1, name: 'Nest' }]);

      vi.useRealTimers();
    });
  });
});
