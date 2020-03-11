import { expect } from 'chai';
import { WsException } from '../../errors/ws-exception';

describe('WsException', () => {
  describe('when string passed', () => {
    const error = 'test';
    const instance = new WsException(error);

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
      const instance = new WsException(error);

      it('should return error as object', () => {
        expect(instance.getError()).to.be.eql(error);
      });
      it('should fallback error message to class name', () => {
        expect(instance.message).to.be.eql('Ws Exception');
      });
    });
    describe('and message property is not undefined', () => {
      const error = { message: 'test', test: true };
      const instance = new WsException(error);

      it('should return error as object', () => {
        expect(instance.getError()).to.be.eql(error);
      });
      it('should return error message as the extracted "message" string', () => {
        expect(instance.message).to.be.eql(error.message);
      });
    });
  });
});
