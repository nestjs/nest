import { Test } from '@nestjs/testing';
import { CatsController } from './cats.controller.js';
import { CatsService } from './cats.service.js';
import { Cat } from './interfaces/cat.interface.js';
import { expect, describe, beforeEach, it } from 'vitest';

describe('CatsController', () => {
  let catsController: CatsController;
  let catsService: CatsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CatsController],
      providers: [CatsService],
    }).compile();

    catsService = moduleRef.get<CatsService>(CatsService);
    catsController = moduleRef.get<CatsController>(CatsController);
  });

  describe('findAll', () => {
    it('should return an array of cats', async () => {
      const cats: Cat[] = [
        {
          age: 2,
          breed: 'Bombay',
          name: 'Pixel',
        },
      ];
      // @ts-expect-error CatsService.cats is any
      catsService.cats = cats;

      console.log(catsController);

      expect(await catsController.findAll()).toBe(cats);
    });
  });

  describe('create', () => {
    it('should add a new cat', async () => {
      const cat: Cat = {
        age: 2,
        breed: 'Bombay',
        name: 'Pixel',
      };
      const expectedCatArray = [cat];

      // @ts-expect-error CatsService.cats is any
      expect(catsService.cats).toStrictEqual([]);

      await catsController.create(cat);

      // @ts-expect-error CatsService.cats is any
      expect(catsService.cats).toStrictEqual(expectedCatArray);
    });
  });
});
