import { Reflector } from '@nestjs/core';

export const Roles = Reflector.createDecorator<string[]>();
