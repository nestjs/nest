import { expect } from 'chai';
import { extendArrayMetadata } from '../../utils/extend-metadata.util';

describe('extendArrayMetadata', () => {
  it('should set metadata when no previous metadata exists', () => {
    const target = () => {};
    extendArrayMetadata('test:key', ['a', 'b'], target);
    expect(Reflect.getMetadata('test:key', target)).to.be.eql(['a', 'b']);
  });

  it('should extend existing metadata array', () => {
    const target = () => {};
    Reflect.defineMetadata('test:key', ['a'], target);
    extendArrayMetadata('test:key', ['b', 'c'], target);
    expect(Reflect.getMetadata('test:key', target)).to.be.eql(['a', 'b', 'c']);
  });

  it('should accept an empty metadata array', () => {
    const target = () => {};
    Reflect.defineMetadata('test:key', ['a'], target);
    extendArrayMetadata('test:key', [], target);
    expect(Reflect.getMetadata('test:key', target)).to.be.eql(['a']);
  });
});
