import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

import { UsersService } from './users.service';

@Injectable()
export class UserByIdPipe implements PipeTransform<string> {
  static COUNTER = 0;
  constructor(private readonly usersService: UsersService) {
    UserByIdPipe.COUNTER++;
  }

  transform(value: string, metadata: ArgumentMetadata) {
    return this.usersService.findById(value);
  }
}
