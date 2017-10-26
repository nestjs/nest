import { ReflectMetadata } from '';

export const Roles = (...roles: string[]) => ReflectMetadata('roles', roles);
