import * as sinon from 'sinon';
import { expect } from 'chai';
import { ArgumentMetadata } from '../../interfaces';
import { IsString, IsOptional } from 'class-validator';
import { ValidationPipe } from '../../pipes/validation.pipe';
import { Exclude, Expose } from 'class-transformer';

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
}

describe('ValidationPipe', () => {
  let target: ValidationPipe;
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: TestModel,
    data: '',
  };
  const metadatainternal: ArgumentMetadata = {
    type: 'body',
    metatype: TestModelInternal,
    data: '',
  };

  describe('transform', () => {
    describe('when validation passes', () => {
      beforeEach(() => {
        target = new ValidationPipe();
      });
      it('should return the value unchanged', async () => {
        const testObj = { prop1: 'value1', prop2: 'value2' };
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
          target = new ValidationPipe({ forbidNonWhitelisted: true });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          expect(target.transform(testObj, metadata)).to.eventually.throw;
        });
      });
      describe('when transformation is internal', () => {
        it('should return a TestModel with internal property', async () => {
          target = new ValidationPipe({ 
            transform: true,
            transformOptions: { groups: ['internal'] }
          });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            propInternal: 'value3'
          };
          expect(
            await target.transform(testObj, metadatainternal)
            ).to.have.property('propInternal');
        });
      });
      describe('when transformation is external', () => {
        it('should return a TestModel without internal property', async () => {
          target = new ValidationPipe({ 
            transform: true,
            transformOptions: { groups: ['external'] }
          });
          const testObj = {
            prop1: 'value1',
            prop2: 'value2',
            propInternal: 'value3'
          };
          expect(
            await target.transform(testObj, metadatainternal)
          ).to.not.have.property('propInternal');
        });
      });
    });
    describe("when validation doesn't transform", () => {
      describe('when validation strips', () => {
        it('should return a plain object without extra properties', async () => {
          target = new ValidationPipe({ transform: false, whitelist: true });
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
            transform: false,
            forbidNonWhitelisted: true,
          });
          const testObj = { prop1: 'value1', prop2: 'value2', prop3: 'value3' };
          expect(target.transform(testObj, metadata)).to.eventually.throw;
        });
      });
    });
  });
});
