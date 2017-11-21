import { HttpException } from '@nestjs/core';
import {
	PipeTransform,
	Pipe,
	ArgumentMetadata,
	HttpStatus,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

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
			throw new HttpException('Validation failed', HttpStatus.BAD_REQUEST);
		}
		return entity;
	}

	private toValidate(metatype): boolean {
		const types = [String, Boolean, Number, Array, Object];
		return !types.find(type => metatype === type);
	}
}
