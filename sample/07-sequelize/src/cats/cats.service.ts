import { Inject, Injectable } from '@nestjs/common';
import { Cat } from './cat.entity';
import { CreateCatDto } from './dto/create-cat.dto';

@Injectable()
export class CatsService {
  constructor(
    @Inject('CATS_REPOSITORY') private readonly catsRepository: typeof Cat,
  ) {}

  async create(createCatDto: CreateCatDto): Promise<Cat> {
    const cat = new Cat();
    cat.name = createCatDto.name;
    cat.breed = createCatDto.breed;
    cat.age = createCatDto.age;

    return await cat.save();
  }

  async findAll(): Promise<Cat[]> {
    return await this.catsRepository.findAll<Cat>();
  }
}
