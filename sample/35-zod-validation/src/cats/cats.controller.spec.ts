import { Test } from '@nestjs/testing';
import { CatsController } from './cats.controller.js';
import { CatsService } from './cats.service.js';
import { Cat } from './interfaces/cat.interface.js';

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
    it('should return an array of cats', () => {
      const cats: Cat[] = [
        {
          age: 2,
          breed: 'Bombay',
          name: 'Pixel',
        },
      ];
      // @ts-ignore
      catsService.cats = cats;

      expect(catsController.findAll()).toBe(cats);
    });
  });

  describe('create', () => {
    it('should add a new cat', () => {
      const cat: Cat = {
        age: 2,
        breed: 'Bombay',
        name: 'Pixel',
      };

      // @ts-ignore
      expect(catsService.cats).toStrictEqual([]);

      catsController.create(cat);

      // @ts-ignore
      expect(catsService.cats).toStrictEqual([cat]);
    });
  });
});
