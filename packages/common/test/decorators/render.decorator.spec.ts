import { expect } from 'chai';

import { RENDER_METADATA } from '../../constants';
import { Render } from '../../decorators/http/render.decorator';

describe('@Render', () => {
  const template = 'template';

  class Test {
    @Render('template')
    public static test() {}
  }

  it('should enhance method with expected template string', () => {
    const metadata = Reflect.getMetadata(RENDER_METADATA, Test.test);
    expect(metadata).to.be.eql(template);
  });
});
