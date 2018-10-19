import { expect } from 'chai';
import { Header } from '../../decorators/http';
import { HEADERS_METADATA } from '../../constants';

describe('@Header', () => {
  class Test {
    @Header('Content-Type', 'Test')
    @Header('Authorization', 'JWT')
    public static test() {}
  }

  it('should enhance method with expected template string', () => {
    const metadata = Reflect.getMetadata(HEADERS_METADATA, Test.test);
    expect(metadata).to.be.eql([
      { name: 'Authorization', value: 'JWT' },
      { name: 'Content-Type', value: 'Test' },
    ]);
  });
});
