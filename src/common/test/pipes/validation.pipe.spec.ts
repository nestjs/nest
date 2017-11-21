import * as sinon from 'sinon';
import { expect } from 'chai';
import { ArgumentMetadata } from './../../interfaces';
import { IsString } from 'class-validator';
import { ValidationPipe } from './../../pipes/validation.pipe';

class TestModel {
	constructor() {}
	@IsString() public prop1: string;

	@IsString() public prop2: string;
}

describe('ValidationPipe', () => {
	let target: ValidationPipe;
	const metadata: ArgumentMetadata = {
		type: 'body',
		metatype: TestModel,
		data: '',
	};
	beforeEach(() => {
		target = new ValidationPipe();
	});
	describe('transform', () => {
		describe('when metadata is empty or undefined', () => {
			it('should return the value unchanged', async () => {
				const testObj = { prop1: 'value1', prop2: 'value2' };
				expect(await target.transform(testObj, {} as any)).to.equal(testObj);
				expect(await target.transform(testObj, {} as any)).to.not.be.instanceOf(
					TestModel,
				);
			});
		});
		describe('when metadata contains a class', () => {
			it('should return an instance of the class', async () => {
				const testObj = { prop1: 'value1', prop2: 'value2' };
				const result = await target.transform(testObj, metadata);
				expect(result).to.be.instanceOf(TestModel);
			});
		});
		describe('when validation vails', () => {
			it('should throw an error', async () => {
				const testObj = { prop1: 'value1' };
				return expect(target.transform(testObj, metadata)).to.be.rejected;
			});
		});
	});
});
