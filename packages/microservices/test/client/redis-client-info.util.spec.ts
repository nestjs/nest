import { expect } from 'chai';
import { getRedisClientInfoTag } from '../../client/redis-client-info.util';

describe('getRedisClientInfoTag', () => {
  it('should return nestjs version tag when package.json is available', () => {
    const result = getRedisClientInfoTag();
    expect(result).to.match(/^nestjs_v\d+\.\d+\.\d+$/);
  });
});
