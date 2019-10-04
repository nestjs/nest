import { ParseIntPipe } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { expect } from 'chai';
import { createParamDecorator } from '../../decorators/http/create-route-param-metadata.decorator';

describe('createParamDecorator', () => {
  let result;

  beforeEach(() => {
    const fn = (data, req) => true;
    result = createParamDecorator(fn);
  });
  it('should return a function as a first element', () => {
    expect(result).to.be.a('function');
  });
  describe('returned decorator', () => {
    const factoryFn = (data, req) => true;
    const Decorator = createParamDecorator(factoryFn);

    describe('when 0 pipes have been passed', () => {
      const data = { data: 'test' };
      class Test {
        public test(@Decorator(data) param) {}
      }
      it('should enhance param with "data"', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).to.be.eql({
          data,
          factory: factoryFn,
          index: 0,
          pipes: [],
        });
      });
    });

    describe('when > 0 pipes have been passed', () => {
      const data = 'test';
      const pipe = new ParseIntPipe();
      class Test {
        public test(
          @Decorator(data, pipe)
          param,
        ) {}

        public testNoData(@Decorator(pipe) param) {}

        public testNoDataClass(@Decorator(ParseIntPipe) param) {}
      }
      it('should enhance param with "data" and ParseIntPipe', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).to.be.eql({
          data: 'test',
          factory: factoryFn,
          index: 0,
          pipes: [pipe],
        });
      });

      it('should enhance param with ParseIntPipe', () => {
        const metadata = Reflect.getMetadata(
          ROUTE_ARGS_METADATA,
          Test,
          'testNoData',
        );
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).to.be.eql({
          data: undefined,
          factory: factoryFn,
          index: 0,
          pipes: [pipe],
        });
      });

      it('should enhance param with ParseIntPipe metatype', () => {
        const metadata = Reflect.getMetadata(
          ROUTE_ARGS_METADATA,
          Test,
          'testNoDataClass',
        );
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).to.be.eql({
          data: undefined,
          factory: factoryFn,
          index: 0,
          pipes: [ParseIntPipe],
        });
      });
    });

    describe('when class type passed as data', () => {
      class Data {}
      class Test {
        public test(@Decorator(Data) prop) {}
      }

      it('should return class type as data parameter', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key].data).to.equal(Data);
      });
    });
  });
});
