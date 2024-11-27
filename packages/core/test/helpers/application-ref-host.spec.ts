import { expect } from 'chai';
import { HttpAdapterHost } from '../../helpers/http-adapter-host';

describe('HttpAdapterHost', () => {
  let applicationRefHost: HttpAdapterHost;
  beforeEach(() => {
    applicationRefHost = new HttpAdapterHost();
  });

  it('should wrap application reference', () => {
    const ref = {};
    applicationRefHost.httpAdapter = ref as any;

    expect(applicationRefHost.httpAdapter).to.be.eql(ref);
  });

  it('should emit listen event when listening is set to true', done => {
    applicationRefHost.listen$.subscribe(() => {
      expect(applicationRefHost.listening).to.be.true;
      done();
    });
    applicationRefHost.listening = true;
  });

  it('listening should return false if the application isnt listening yet', () => {
    expect(applicationRefHost.listening).to.be.false;
  });
});
