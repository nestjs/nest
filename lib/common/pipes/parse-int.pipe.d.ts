import { PipeTransform } from '../interfaces/features/pipe-transform.interface';
import { ArgumentMetadata } from '../index';
export declare class ParseIntPipe implements PipeTransform<string> {
    transform(value: string, metadata: ArgumentMetadata): Promise<number>;
}
