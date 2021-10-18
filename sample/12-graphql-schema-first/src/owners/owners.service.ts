import { Injectable } from '@nestjs/common';
import { Owner } from '../graphql.schema';

@Injectable()
export class OwnersService {
  private readonly owners: Owner[] = [{ id: 1, name: 'Jon', age: 5 }];

  findOneById(id: number): Owner {
    return this.owners.find(owner => owner.id === id);
  }
}
