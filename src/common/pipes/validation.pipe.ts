import { ArgumentMetadata, BadRequestException } from '../index';

import { Pipe } from './../decorators/core/component.decorator';
import { PipeTransform } from '../interfaces/pipe-transform.interface';
import { isNil } from '../utils/shared.utils';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

@Pipe()
export class ValidationPipe implements PipeTransform<any> {
	public async transform(value: any, metadata: ArgumentMetadata) {
		const { metatype } = metadata;
		if (!metatype || !this.toValidate(metatype)) {
			return value;
		}
		const entity = plainToClass(metatype, value);
		const errors = await validate(entity);
		if (errors.length > 0) {
			throw new BadRequestException(errors);
		}
		return value;
	}

	private toValidate(metatype: any): boolean {
		const types = [String, Boolean, Number, Array, Object];
		return !types.find(type => metatype === type) && !isNil(metatype);
	}
}
