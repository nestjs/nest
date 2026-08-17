import { Test, TestingModule } from '@nestjs/testing';
import { CreateCatDto } from './dto/create-cat.dto';
import { CatsService } from './cats.service';

describe('CatsService', () => {
  let service: CatsService;

  const createCatDto: CreateCatDto = {
    name: 'Kitty',
    age: 2,
    breed: 'Maine Coon',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatsService],
    }).compile();

    service = module.get<CatsService>(CatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should add a cat and return it', () => {
      const result = service.create(createCatDto);
      expect(result).toEqual(createCatDto);
    });
  });

  describe('findOne', () => {
    it('should return undefined when no cats exist', () => {
      expect(service.findOne(0)).toBeUndefined();
    });

    it('should return the cat at the given index after creation', () => {
      service.create(createCatDto);
      expect(service.findOne(0)).toEqual(createCatDto);
    });
  });
});
