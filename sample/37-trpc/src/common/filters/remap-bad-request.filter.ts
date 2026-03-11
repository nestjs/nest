import {
  BadRequestException,
  ExceptionFilter,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

@Injectable()
export class RemapBadRequestFilter implements ExceptionFilter<BadRequestException> {
  catch(_exception: BadRequestException): never {
    throw new UnprocessableEntityException('filtered invalid payload');
  }
}
