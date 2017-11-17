import {HttpStatus} from '@nestjs/common';
import {HttpException} from '@nestjs/core';

export class ForbiddenException extends HttpException {
  constructor() { super('Forbidden', HttpStatus.FORBIDDEN); }
}