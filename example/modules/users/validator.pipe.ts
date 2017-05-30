import { PipeTransform, Pipe } from '@nestjs/common';
import { CustomException } from './exception.filter';

@Pipe()
export class ValidatorPipe implements PipeTransform {
    public transform(value, metatype, token): any {
        return value;
    }
}