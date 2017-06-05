import { PipeTransform, Pipe, ArgumentMetadata } from '@nestjs/common';
import { HttpException, HttpStatus } from '../../src/index';

@Pipe()
export class ValidatorPipe implements PipeTransform {
    public async transform(value, metadata: ArgumentMetadata) {
        return value;
    }
}