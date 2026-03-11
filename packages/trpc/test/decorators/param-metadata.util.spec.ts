import { expect } from 'chai';
import 'reflect-metadata';
import { TRPC_PARAM_ARGS_METADATA } from '../../constants';
import { TrpcParamtype } from '../../enums';
import { addTrpcParamMetadata } from '../../decorators/param-metadata.util';

describe('addTrpcParamMetadata', () => {
  it('should do nothing when propertyKey is undefined', () => {
    const target = {};
    addTrpcParamMetadata(target, undefined, 0, TrpcParamtype.INPUT);
    // No metadata should be set on the target itself
    expect(Reflect.getMetadataKeys(target)).to.have.length(0);
  });

  it('should do nothing when target[propertyKey] is not a function', () => {
    const target: Record<string, any> = { myProp: 'not-a-function' };
    addTrpcParamMetadata(target, 'myProp', 0, TrpcParamtype.INPUT);
    // The string value should remain unchanged — no metadata-capable target
    expect(target.myProp).to.equal('not-a-function');
  });

  it('should set metadata when target[propertyKey] is a function', () => {
    const fn = () => {};
    const target = { myMethod: fn };
    addTrpcParamMetadata(target, 'myMethod', 0, TrpcParamtype.INPUT, 'name');

    const meta = Reflect.getMetadata(TRPC_PARAM_ARGS_METADATA, fn);
    expect(meta).to.deep.equal([
      { index: 0, type: TrpcParamtype.INPUT, data: 'name' },
    ]);
  });

  it('should sort metadata entries by index', () => {
    const fn = () => {};
    const target = { m: fn };
    // Add in reverse order
    addTrpcParamMetadata(target, 'm', 2, TrpcParamtype.CONTEXT);
    addTrpcParamMetadata(target, 'm', 0, TrpcParamtype.INPUT);
    addTrpcParamMetadata(target, 'm', 1, TrpcParamtype.INPUT, 'field');

    const meta = Reflect.getMetadata(TRPC_PARAM_ARGS_METADATA, fn);
    expect(meta.map((m: any) => m.index)).to.deep.equal([0, 1, 2]);
  });
});
