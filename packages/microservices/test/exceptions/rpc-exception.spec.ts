import { RpcException } from '../../exceptions/rpc-exception.js';

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
    describe('and class name cannot be split into words', () => {
      class RPC extends RpcException {}
      const error = { test: true };
      const instance = new RPC(error);

      it('should fallback error message to "Error"', () => {
        expect(instance.message).toEqual('Error');
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
