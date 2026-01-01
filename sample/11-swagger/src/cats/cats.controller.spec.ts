import { Test, TestingModule } from '@nestjs/testing';
import { CreateCatDto } from './dto/create-cat.dto';
import { Cat } from './entities/cat.entity';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

describe('CatsController', () => {
  let controller: CatsController;
  let service: CatsService;

  const cat: Cat = { name: 'Kitty', age: 2, breed: 'Maine Coon' };
  const createCatDto: CreateCatDto = {
    name: 'Kitty',
    age: 2,
    breed: 'Maine Coon',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatsController],
      providers: [
        {
          provide: CatsService,
          useValue: {
            create: jest.fn().mockReturnValue(cat),
            findOne: jest.fn().mockReturnValue(cat),
          },
        },
      ],
    }).compile();

    controller = module.get<CatsController>(CatsController);
    service = module.get<CatsService>(CatsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return the created cat', async () => {
      const result = await controller.create(createCatDto);
      expect(service.create).toHaveBeenCalledWith(createCatDto);
      expect(result).toEqual(cat);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with parsed id and return the cat', () => {
      const result = controller.findOne('0');
      expect(service.findOne).toHaveBeenCalledWith(0);
      expect(result).toEqual(cat);
    });
  });
});
