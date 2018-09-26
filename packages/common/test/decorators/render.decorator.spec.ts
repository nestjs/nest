import 'reflect-metadata';
import { expect } from 'chai';
import { Render } from '@nestjs/common/decorators/http/render.decorator';
import { RENDER_METADATA } from '@nestjs/common/constants';

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
