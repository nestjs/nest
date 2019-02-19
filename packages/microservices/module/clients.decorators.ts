import { getClientToken } from './clients.utils';

export const InjectClient = (name: string) => getClientToken(name);
