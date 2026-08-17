import { ValidationPipe } from '@nestjs/common';
import { PARAM_ARGS_METADATA } from '../../constants.js';
import { MessageBody } from '../../decorators/index.js';
import { WsParamtype } from '../../enums/ws-paramtype.enum.js';

class MessagePayloadTest {
  public test(@MessageBody(ValidationPipe) payload: any) {}
}

describe('@MessagePayload', () => {
  it('should enhance class with expected request metadata', () => {
    const argsMetadata = Reflect.getMetadata(
      PARAM_ARGS_METADATA,
      MessagePayloadTest,
      'test',
    );
    const expectedMetadata = {
      [`${WsParamtype.PAYLOAD}:0`]: {
        data: undefined,
        index: 0,
        pipes: [ValidationPipe],
      },
    };
    expect(argsMetadata).toEqual(expectedMetadata);
  });
});

describe('@MessageBody with ParameterDecoratorOptions', () => {
  const mockSchema = {
    '~standard': {
      version: 1 as const,
      vendor: 'test',
      validate: (v: unknown) => ({ value: v }),
    },
  };

  it('should enhance param with schema when options passed as the only argument', () => {
    class Test {
      public test(@MessageBody({ schema: mockSchema }) body: any) {}
    }
    const metadata = Reflect.getMetadata(PARAM_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key]).toEqual({
      index: 0,
      data: undefined,
      pipes: [],
      schema: mockSchema,
    });
  });

  it('should enhance param with pipes when options with pipes passed as the only argument', () => {
    class Test {
      public test(
        @MessageBody({ schema: mockSchema, pipes: [ValidationPipe] }) body: any,
      ) {}
    }
    const metadata = Reflect.getMetadata(PARAM_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key]).toEqual({
      index: 0,
      data: undefined,
      pipes: [ValidationPipe],
      schema: mockSchema,
    });
  });

  it('should enhance param with schema when options passed as second argument with property', () => {
    class Test {
      public test(@MessageBody('data', { schema: mockSchema }) data: any) {}
    }
    const metadata = Reflect.getMetadata(PARAM_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key]).toEqual({
      index: 0,
      data: 'data',
      pipes: [],
      schema: mockSchema,
    });
  });

  it('should not confuse a pipe instance with options', () => {
    class Test {
      public test(@MessageBody(new ValidationPipe()) body: any) {}
    }
    const metadata = Reflect.getMetadata(PARAM_ARGS_METADATA, Test, 'test');
    const key = Object.keys(metadata)[0];
    expect(metadata[key].data).toBeUndefined();
    expect(metadata[key].pipes).toHaveLength(1);
    expect(metadata[key].schema).toBeUndefined();
  });
});
