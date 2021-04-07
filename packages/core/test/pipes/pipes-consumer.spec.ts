import { expect } from 'chai';
import * as sinon from 'sinon';

import { RouteParamtypes } from '../../../common/enums/route-paramtypes.enum';
import { PipesConsumer } from '../../pipes/pipes-consumer';

const createPipe = (transform: Function) => ({ transform });

describe('PipesConsumer', () => {
  let consumer: PipesConsumer;
  beforeEach(() => {
    consumer = new PipesConsumer();
  });
  describe('apply', () => {
    let value, metatype, type, stringifiedType, transforms, data;
    beforeEach(() => {
      value = 0;
      data = null;
      (metatype = {}), (type = RouteParamtypes.QUERY);
      stringifiedType = 'query';
      transforms = [
        createPipe(sinon.stub().callsFake(val => val + 1)),
        createPipe(sinon.stub().callsFake(val => Promise.resolve(val + 1))),
        createPipe(sinon.stub().callsFake(val => val + 1)),
      ];
    });
    it('should call all transform functions', done => {
      consumer.apply(value, { metatype, type, data }, transforms).then(() => {
        expect(
          transforms.reduce(
            (prev, next) => prev && next.transform.called,
            true,
          ),
        ).to.be.true;
        done();
      });
    });
    it('should returns expected result', done => {
      const expectedResult = 3;
      consumer
        .apply(value, { metatype, type, data }, transforms)
        .then(result => {
          expect(result).to.be.eql(expectedResult);
          done();
        });
    });
  });
});
