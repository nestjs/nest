import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Exclude, Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { ArgumentMetadata } from '../../interfaces';
import { ValidationPipe } from '../../pipes/validation.pipe';
chai.use(chaiAsPromised);

@Exclude()
class TestModelInternal {
  constructor() {}
  @Expose()
  @IsString()
  public prop1: string;

  @Expose()
  @IsString()
  public prop2: string;

  @Expose({ groups: ['internal'] })
  @IsString()
  @IsOptional()
  public propInternal: string;
}

class TestModel {
  constructor() {}
  @IsString() public prop1: string;

  @IsString() public prop2: string;

  @IsOptional()
  @IsString()
  public optionalProp: string;
}

class TestModelNoValidaton {
  constructor() {}

  public prop1: string;
  public prop2: string;
  public optionalProp: string;
}

describe('ValidationPipe', () => {
  let target: ValidationPipe;
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: TestModel,
    data: '',
  };
  const transformMetadata: ArgumentMetadata = {
    type: 'body',
    metatype: TestModelInternal,
    data: '',
  };

  describe('transform', () => {
    describe('when validation passes', () => {
      beforeEach(() => {
        target = new ValidationPipe();
      });
      it('should return the value unchanged if optional value is not defined', async () => {
        const testObj = { prop1: 'value1', prop2: 'value2' };
        expect(await target.transform(testObj, {} as any)).to.equal(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).to.not.be.instanceOf(TestModel);
      });
      it('should return the value unchanged if optional value is set undefined', async () => {
        const testObj = {
          prop1: 'value1',
          prop2: 'value2',
          optionalProp: undefined,
        };
        expect(await target.transform(testObj, {} as any)).to.equal(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).to.not.be.instanceOf(TestModel);
      });
      it('should return the value unchanged if optional value is null', async () => {
        const testObj = {
          prop1: 'value1',
          prop2: 'value2',
          optionalProp: null,
        };
        expect(await target.transform(testObj, {} as any)).to.equal(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).to.not.be.instanceOf(TestModel);
      });
      it('should return the value unchanged if optional value is set', async () => {
        const testObj = {
          prop1: 'value1',
          prop2: 'value2',
          optionalProp: 'optional value',
        };
        expect(await target.transform(testObj, {} as any)).to.equal(testObj);
        expect(
          await target.transform(testObj, metadata as any),
        ).to.not.be.instanceOf(TestModel);
      });
    });
    describe('when validation fails', () => {
      beforeEach(() => {
        target = new ValidationPipe();
      });
      it('should throw an error', async () => {
        const testObj = { prop1: 'value1' };
        return expect(target.transform(testObj, metadata)).to.be.rejected;
      });
    });
    describe('when validation transforms', () => {
      it('should return a TestModel instance', async () => {
        target = new ValidationPipe({ transform: true });
        const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
        expect(await target.transform(testObj, metadata)).to.be.instanceOf(
          TestModel,
        );
      });
      describe('when validation strips', () => {
        it('should return a TestModel without extra properties', async () => {
          target = new ValidationPipe({ whitelist: true });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          expect(
            await target.transform(testObj, metadata),
          ).to.not.be.instanceOf(TestModel);
          expect(
            await target.transform(testObj, metadata),
          ).to.not.have.property('prop3');
        });
      });
      describe('when validation rejects', () => {
        it('should throw an error', () => {
          target = new ValidationPipe({
            forbidNonWhitelisted: true,
            whitelist: true,
          });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          expect(target.transform(testObj, metadata)).to.eventually.be.rejected;
        });
      });
      describe('when transformation is internal', () => {
        it('should return a TestModel with internal property', async () => {
          target = new ValidationPipe({
            transform: true,
            transformOptions: { groups: ['internal'] },
          });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            propInternal: 'value3',
          };
          expect(
            await target.transform(testObj, transformMetadata),
          ).to.have.property('propInternal');
        });
      });
      describe('when transformation is external', () => {
        it('should return a TestModel without internal property', async () => {
          target = new ValidationPipe({
            transform: true,
            transformOptions: { groups: ['external'] },
          });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            propInternal: 'value3',
          };
          expect(
            await target.transform(testObj, transformMetadata),
          ).to.not.have.property('propInternal');
        });
      });
    });
    describe('when validation does not transform', () => {
      describe('when validation strips', () => {
        it('should return a plain object without extra properties', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          const result = await target.transform(testObj, metadata);

          expect(result).to.not.be.instanceOf(TestModel);
          expect(result).to.not.have.property('prop3');
          expect(result).to.not.have.property('optionalProp');
        });
        it('should return a plain object without extra properties if optional prop is defined', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            prop3: 'value3',
            optionalProp: 'optional value',
          };
          const result = await target.transform(testObj, metadata);
          expect(result).to.not.be.instanceOf(TestModel);
          expect(result).to.not.have.property('prop3');
          expect(result).to.have.property('optionalProp');
        });
        it('should return a plain object without extra properties if optional prop is undefined', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            prop3: 'value3',
            optionalProp: undefined,
          };
          const result = await target.transform(testObj, metadata);
          expect(result).to.not.be.instanceOf(TestModel);
          expect(result).to.not.have.property('prop3');
          expect(result).to.have.property('optionalProp');
        });
        it('should return a plain object without extra properties if optional prop is null', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            prop3: 'value3',
            optionalProp: null,
          };

          const result = await target.transform(testObj, metadata);
          expect(result).to.not.be.instanceOf(TestModel);
          expect(result).to.not.have.property('prop3');
          expect(result).to.have.property('optionalProp');
        });
      });
      describe('when validation rejects', () => {
        it('should throw an error', () => {
          target = new ValidationPipe({
            transform: false,
            forbidNonWhitelisted: true,
            whitelist: true,
          });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          expect(target.transform(testObj, metadata)).to.eventually.be.rejected;
        });
      });
    });
    describe('when type doesnt match', () => {
      describe('when validation rules are applied', () => {
        it('should throw an error', async () => {
          target = new ValidationPipe();
          const testObj = [
            { prop1: 'value1', prop2: 'value2', prop3: 'value3' },
          ];

          expect(target.transform(testObj, metadata)).to.eventually.be.rejected;
          expect(target.transform('string', metadata)).to.eventually.be
            .rejected;
          expect(target.transform(true, metadata)).to.eventually.be.rejected;
          expect(target.transform(3, metadata)).to.eventually.be.rejected;
        });
      });
      describe('otherwise', () => {
        it('should not reject', async () => {
          target = new ValidationPipe();
          const testObj = [
            { prop1: 'value1', prop2: 'value2', prop3: 'value3' },
          ];

          const objMetadata = { ...metadata, metatype: TestModelNoValidaton };
          const result = await target.transform(testObj, objMetadata);

          expect(result).to.not.be.instanceOf(TestModel);
          expect(result).to.be.eql(testObj);

          // primitives
          expect(await target.transform('string', objMetadata)).to.be.eql(
            'string',
          );
          expect(await target.transform(3, objMetadata)).to.be.eql(3);
          expect(await target.transform(true, objMetadata)).to.be.eql(true);
        });
      });
    });
    describe('when value is null', () => {
      it('should return null', async () => {
        target = new ValidationPipe();

        const result = await target.transform(null, metadata);

        expect(result).to.be.null;
      });
    });
    describe('when value is undefined', () => {
      it('should return undefined', async () => {
        target = new ValidationPipe();

        const result = await target.transform(undefined, metadata);

        expect(result).to.be.undefined;
      });
    });
  });
});
