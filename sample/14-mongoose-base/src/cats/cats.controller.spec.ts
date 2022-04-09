import { Test, TestingModule } from '@nestjs/testing';
import { CatsController } from './cats.controller';
import { CreateCatDto } from './dto/create-cat.dto';
import { CatsService } from './cats.service';

describe('CatsController', () => {
  let controller: CatsController;
  let service: CatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatsController],
      providers: [
        {
          provide: CatsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([
              {
                name: 'Cat #1',
                breed: 'Bread #1',
                age: 4,
              },
              {
                name: 'Cat #2',
                breed: 'Breed #2',
                age: 3,
              },
              {
                name: 'Cat #3',
                breed: 'Breed #3',
                age: 2,
              },
            ]),
            create: jest
              .fn()
              .mockImplementation((createCatDto: CreateCatDto) =>
                Promise.resolve({ _id: '1', ...createCatDto }),
              ),
          },
        },
      ],
    }).compile();

    controller = module.get(CatsController);
    service = module.get(CatsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create()', () => {
    it('should create a new cat', async () => {
      const createCatDto: CreateCatDto = {
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      };

      expect(controller.create(createCatDto)).resolves.toEqual({
        _id: '1',
        ...createCatDto,
      });
    });
  });

  describe('findAll()', () => {
    it('should get an array of cats', () => {
      expect(controller.findAll()).resolves.toEqual([
        {
          name: 'Cat #1',
          breed: 'Bread #1',
          age: 4,
        },
        {
          name: 'Cat #2',
          breed: 'Breed #2',
          age: 3,
        },
        {
          name: 'Cat #3',
          breed: 'Breed #3',
          age: 2,
        },
      ]);
    });
  });
});
