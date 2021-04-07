import { ArgumentMetadata,Injectable, PipeTransform } from '@nestjs/common';

import { UsersService } from './users.service';

@Injectable()
export class UserByIdPipe implements PipeTransform<string> {
  constructor(private readonly usersService: UsersService) {}

  transform(value: string, metadata: ArgumentMetadata) {
    return this.usersService.findById(value);
  }
}
