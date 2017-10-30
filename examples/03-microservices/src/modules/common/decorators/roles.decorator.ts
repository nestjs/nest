import { ReflectMetadata } from '@nestjs/core';

export const Roles = (...roles: string[]) => ReflectMetadata('roles', roles);
