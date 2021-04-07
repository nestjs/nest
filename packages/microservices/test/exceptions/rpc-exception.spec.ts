import { expect } from 'chai';

import { RpcException } from '../../exceptions/rpc-exception';

describe('RpcException', () => {
  describe('when string passed', () => {
    const error = 'test';
    const instance = new RpcException(error);

    it('should return error message as string', () => {
      expect(instance.getError()).to.be.eql(error);
    });
    it('should set the message property', () => {
      expect(instance.message).to.be.eql(error);
    });
  });

  describe('when object passed', () => {
    describe('and message property is undefined', () => {
      const error = { test: true };
      const instance = new RpcException(error);

      it('should return error as object', () => {
        expect(instance.getError()).to.be.eql(error);
      });
      it('should fallback error message to class name', () => {
        expect(instance.message).to.be.eql('Rpc Exception');
      });
    });
    describe('and message property is not undefined', () => {
      const error = { message: 'test', test: true };
      const instance = new RpcException(error);

      it('should return error as object', () => {
        expect(instance.getError()).to.be.eql(error);
      });
      it('should return error message as the extracted "message" string', () => {
        expect(instance.message).to.be.eql(error.message);
      });
    });
  });
});
