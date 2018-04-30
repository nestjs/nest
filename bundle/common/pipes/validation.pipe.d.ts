import { PipeTransform } from '../interfaces/features/pipe-transform.interface';
import { ArgumentMetadata } from '../index';
import { ValidatorOptions } from '../interfaces/external/validator-options.interface';
export interface ValidationPipeOptions extends ValidatorOptions {
    transform?: boolean;
}
export declare class ValidationPipe implements PipeTransform<any> {
    private isTransformEnabled;
    private validatorOptions;
    constructor(options?: ValidationPipeOptions);
    transform(value: any, metadata: ArgumentMetadata): Promise<any>;
    private toValidate(metadata);
}
