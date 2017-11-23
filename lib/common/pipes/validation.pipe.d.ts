import { PipeTransform } from '../interfaces/pipe-transform.interface';
import { ArgumentMetadata } from '../index';
export declare class ValidationPipe implements PipeTransform<any> {
    transform(value: any, metadata: ArgumentMetadata): Promise<any>;
    private toValidate(metatype);
}
