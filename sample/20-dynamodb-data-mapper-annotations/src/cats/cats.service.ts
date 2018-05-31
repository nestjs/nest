import { Injectable } from '@nestjs/common';

import { CreateCatDto } from './dto/create-cat.dto';
import { Cat } from './schemas/cat.schema';
import { DynamoDBDataMapperService } from '../dynamodb-data-mapper/dynamodb-data-mapper.service';

@Injectable()
export class CatsService {
  constructor(private readonly dynamoDB: DynamoDBDataMapperService) {}

  async createCatsTable() {
    await this.dynamoDB.mapper.createTable(Cat, {
      readCapacityUnits: 5,
      writeCapacityUnits: 5,
    });
  }

  async deleteCatsTable() {
    await this.dynamoDB.mapper.deleteTable(Cat);
  }

  async create(createCatDto: CreateCatDto): Promise<Cat> {
    const createdCat = new Cat();
    createdCat.createdAt = new Date();
    createdCat.name = createCatDto.name;
    createdCat.age = createCatDto.age;
    createdCat.breed = createCatDto.breed;
    return this.dynamoDB.mapper.put(createdCat);
  }

  async findAll(): Promise<Cat[]> {
    // Observable.from(AsyncIterator) will land in RxJS v7
    // https://github.com/ReactiveX/rxjs/issues/1624
    return new Promise<Cat[]>(async (resolve, reject) => {
      try {
        const results: Cat[] = [];
        for await (const item of this.dynamoDB.mapper.scan<Cat>(Cat)) {
            results.push(item);
        }
        resolve(results);
      } catch (error) {
        reject(error);
      }
    });
  }
}
