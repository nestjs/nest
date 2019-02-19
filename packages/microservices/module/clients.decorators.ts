import { Inject } from '@nestjs/common';
import { DEFAULT_CLIENT } from './clients.constants';
import { getClientToken } from './clients.utils';

export const InjectClient = (
  name?: string,
): PropertyDecorator | ParameterDecorator =>
  Inject(name ? getClientToken(name) : DEFAULT_CLIENT);
