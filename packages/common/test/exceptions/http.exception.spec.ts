import { expect } from 'chai';
import { BadRequestException, HttpException, NotFoundException } from '../../exceptions';

describe('HttpException', () => {
  it('should return a message as a string when input is a string', () => {
    const message: string = 'My error message';
    expect(new HttpException(message, 404).message).to.be.eql('My error message');
  });

  it('should return a message as an object when input is an object', () => {
    const message: object = {
      msg: 'My error message',
      reason: 'this can be a human readable reason',
      anything: 'else',
    };
    expect(new HttpException(message, 404).message).to.be.eql(message);
  });

  it('should return a message from a built-in exception as an object', () => {
    const message: string = 'My error message';
    expect(new BadRequestException(message).message).to.be.eql({
      statusCode: 400,
      error: 'Bad Request',
      message: 'My error message',
    });
  });

  it('should return an object even when the message is undefined', () => {
    expect(new BadRequestException().message).to.be.eql({statusCode: 400, error: 'Bad Request'});
  });

  it('should return a status code', () => {
    expect(new BadRequestException().getStatus()).to.be.eql(400);
    expect(new NotFoundException().getStatus()).to.be.eql(404);
  });

  it('should return a response', () => {
    expect(new BadRequestException().getResponse()).to.be.eql({
      error: 'Bad Request',
      statusCode: 400,
    });
    expect(new NotFoundException().getResponse()).to.be.eql({
      error: 'Not Found',
      statusCode: 404,
    });
  });

  it('should inherit from error', () => {
    const error = new HttpException('', 400);
    expect(error instanceof Error).to.be.true;
  });

  it('should be serializable', () => {
    const message = 'Some Error';
    const error = new HttpException(message, 400);
    expect(`${error}`).to.be.eql(`Error: ${message}`);
  });

  describe('when "message" is an object', () => {
    it('should serialize an object', () => {
      const obj = { foo: 'bar' };
      const error = new HttpException(obj, 400);
      expect(`${error}`).to.be.eql(`Error: ${JSON.stringify(obj)}`);
      expect(`${error}`.includes('[object Object]')).to.not.be.true;
    });

    it('should serialize sub errors', () => {
      const error = new NotFoundException();
      expect(`${error}`.includes('Not Found')).to.be.true;
    });
  });
});
