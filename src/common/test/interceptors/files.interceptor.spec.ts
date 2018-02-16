import * as sinon from 'sinon';
import { expect } from 'chai';
import { FilesInterceptor } from './../../interceptors/files.interceptor';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';

describe('FilesInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = FilesInterceptor('file');
    expect(targetClass.prototype.intercept).to.not.be.undefined;
  });
  describe('intercept', () => {
    let stream$;
    beforeEach(() => {
      stream$ = of('test');
    });
    it('should call array() with expected params', async () => {
      const fieldName = 'file';
      const maxCount = 10;
      const target = new (FilesInterceptor(fieldName, maxCount));

      const callback = (req, res, next) => next();
      const arraySpy = sinon.stub((target as any).upload, 'array').returns(callback);

      await target.intercept({}, null, stream$);

      expect(arraySpy.called).to.be.true;
      expect(arraySpy.calledWith(fieldName, maxCount)).to.be.true;
    });
  });
});
