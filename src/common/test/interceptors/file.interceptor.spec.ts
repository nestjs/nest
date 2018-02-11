import * as sinon from 'sinon';
import { expect } from 'chai';
import { FileInterceptor } from './../../interceptors/file.interceptor';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';

describe('FileInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = FileInterceptor('file');
    expect(targetClass.prototype.intercept).to.not.be.undefined;
  });
  describe('intercept', () => {
    let stream$;
    beforeEach(() => {
      stream$ = Observable.of('test');
    });
    it('should call single() with expected params', async () => {
      const fieldName = 'file';
      const target = new (FileInterceptor(fieldName));
      const callback = (req, res, next) => next();
      const singleSpy = sinon.stub((target as any).upload, 'single').returns(callback);
      const req = {};

      await target.intercept(req, null, stream$);

      expect(singleSpy.called).to.be.true;
      expect(singleSpy.calledWith(fieldName)).to.be.true;
    });
  });
});
