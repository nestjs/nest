import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class UserByIdPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    return { id: value };
  }
}
