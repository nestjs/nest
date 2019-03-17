import { expect } from 'chai';
import { HttpAdapterHost } from '../../helpers/http-adapter-host';

describe('HttpAdapterHost', () => {
  const applicationRefHost = new HttpAdapterHost();
  it('should wrap application reference', () => {
    const ref = {};
    applicationRefHost.httpAdapter = ref as any;

    expect(applicationRefHost.httpAdapter).to.be.eql(ref);
  });
});
