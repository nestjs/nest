import { PipeTransform, Pipe } from '@nestjs/common';
import { CustomException } from './exception.filter';
import { ArgumentMetadata } from '@nestjs/common';

@Pipe()
export class ValidatorPipe implements PipeTransform {
    public transform(value, metadata: ArgumentMetadata) {
        // validation logic
        console.log(metadata);
        return value;
    }
}