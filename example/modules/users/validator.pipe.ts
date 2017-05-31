import { PipeTransform, Pipe } from '@nestjs/common';
import { CustomException } from './exception.filter';

@Pipe()
export class ValidatorPipe implements PipeTransform {
    public async transform(value, metadata?) {
        console.log(value, metadata);
        return Promise.resolve(value);
    }
}