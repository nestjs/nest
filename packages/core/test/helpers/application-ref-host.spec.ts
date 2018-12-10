import { expect } from 'chai';
import { ApplicationReferenceHost } from './../../helpers/application-ref-host';

describe('ApplicationReferenceHost', () => {
  const applicationRefHost = new ApplicationReferenceHost();
  it('should wrap application reference', () => {
    const ref = {};
    applicationRefHost.applicationRef = ref;

    expect(applicationRefHost.applicationRef).to.be.eql(ref);
  });
});
