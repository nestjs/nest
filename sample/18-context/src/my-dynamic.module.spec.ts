import { Test, TestingModule } from '@nestjs/testing';
import { MyDynamicModule } from './my-dynamic.module';

describe('MyDynamicModule', () => {
  it('should create a dynamic module with the correct provider', () => {
    const dynamicModule = MyDynamicModule.register('test-value');

    expect(dynamicModule.module).toBe(MyDynamicModule);
    expect(dynamicModule.providers).toBeDefined();
    expect(dynamicModule.providers?.length).toBe(1);
    expect(dynamicModule.providers?.[0]).toEqual({
      provide: 'MyDynamicProvider',
      useValue: 'test-value',
    });
    expect(dynamicModule.exports).toEqual(['MyDynamicProvider']);
  });

  it('should make the provider value accessible', async () => {
    const testValue = { foo: 'bar', baz: 42 };
    const module: TestingModule = await Test.createTestingModule({
      imports: [MyDynamicModule.register(testValue)],
    }).compile();

    const provider = module.get('MyDynamicProvider');
    expect(provider).toEqual(testValue);
  });

  it('should accept different value types', async () => {
    const stringModule = await Test.createTestingModule({
      imports: [MyDynamicModule.register('string-value')],
    }).compile();
    expect(stringModule.get('MyDynamicProvider')).toBe('string-value');

    const numberModule = await Test.createTestingModule({
      imports: [MyDynamicModule.register(123)],
    }).compile();
    expect(numberModule.get('MyDynamicProvider')).toBe(123);

    const objectModule = await Test.createTestingModule({
      imports: [MyDynamicModule.register({ key: 'value' })],
    }).compile();
    expect(objectModule.get('MyDynamicProvider')).toEqual({ key: 'value' });
  });
});
