import { RpcException } from '../../exceptions/rpc-exception';

describe('RpcException', () => {
  describe('when string passed', () => {
    const error = 'test';
    const instance = new RpcException(error);

    it('should return error message as string', () => {
      expect(instance.getError()).toEqual(error);
    });
    it('should set the message property', () => {
      expect(instance.message).toEqual(error);
    });
  });

  describe('when object passed', () => {
    describe('and message property is undefined', () => {
      const error = { test: true };
      const instance = new RpcException(error);

      it('should return error as object', () => {
        expect(instance.getError()).toEqual(error);
      });
      it('should fallback error message to class name', () => {
        expect(instance.message).toEqual('Rpc Exception');
      });
    });
    describe('and message property is not undefined', () => {
      const error = { message: 'test', test: true };
      const instance = new RpcException(error);

      it('should return error as object', () => {
        expect(instance.getError()).toEqual(error);
      });
      it('should return error message as the extracted "message" string', () => {
        expect(instance.message).toEqual(error.message);
      });
    });
  });
});
