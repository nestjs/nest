import { Test, TestingModule } from '@nestjs/testing';
import { CatsService } from './cats.service';
import { Cat } from 'src/graphql.schema';

describe('CatsService', () => {
  let service: CatsService;
  const cat: Cat = { name: 'Cat', age: 5 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatsService],
    }).compile();

    service = module.get<CatsService>(CatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a new cat', () => {
    const newCat = service.create(cat);
    expect(newCat.name).toEqual(cat.name);
    expect(newCat).toEqual({ id: 1, ...cat });
  });

  it('should return all cats', () => {
    const cats = service.findAll();
    expect(cats.length).toEqual(1);
    expect(cats[0].name).toEqual(cat.name);
  });

  it('should return a cat by id', () => {
    const cat = service.findOneById(1);
    expect(cat).toEqual({ ...cat, id: 1 });
  });

  it('should return undefined if cat not found', () => {
    const cat = service.findOneById(2);
    expect(cat).toBeUndefined();
  });
});
