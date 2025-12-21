import { Test } from '@nestjs/testing';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';
import { Cat } from './interfaces/cat.interface';

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
      // @ts-ignore
      catsService.cats = cats;

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

      // @ts-ignore
      expect(catsService.cats).toStrictEqual([]);

      await catsController.create(cat);

      // @ts-ignore
      expect(catsService.cats).toStrictEqual(expectedCatArray);
    });
  });
});
