import { Test, TestingModule } from '@nestjs/testing';
import { CatsController } from './cats.controller.js';
import { CatsService } from './cats.service.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Reflector } from '@nestjs/core';

describe('CatsController', () => {
  let controller: CatsController;
  let service: CatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatsController],
      providers: [CatsService, RolesGuard, Reflector],
    }).compile();

    controller = module.get<CatsController>(CatsController);
    service = module.get<CatsService>(CatsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll()', () => {
    it('should return an array of cats', async () => {
      const result: { name: string; age: number; breed: string }[] = [
        { name: 'Whiskers', age: 3, breed: 'Persian' },
      ];
      vi.spyOn(service, 'findAll').mockImplementation(() => result);

      expect(await controller.findAll()).toBe(result);
    });
  });

  describe('create()', () => {
    it('should create a cat', async () => {
      const createCatDto = { name: 'Whiskers', age: 3, breed: 'Persian' };
      const createSpy = vi.spyOn(service, 'create');

      await controller.create(createCatDto);
      expect(createSpy).toHaveBeenCalledWith(createCatDto);
    });
  });
});
