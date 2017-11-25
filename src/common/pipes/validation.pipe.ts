import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { PipeTransform } from '../interfaces/pipe-transform.interface';
import { Pipe, ArgumentMetadata, BadRequestException } from '../index';
import { isNil } from '../utils/shared.utils';

@Pipe()
export class ValidationPipe implements PipeTransform<any> {
	public async transform(value, metadata: ArgumentMetadata) {
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

	private toValidate(metatype): boolean {
		const types = [String, Boolean, Number, Array, Object];
		return !types.find(type => metatype === type) && !isNil(metatype);
	}
}
