import { DEFAULT_CLIENT } from './clients.constants';

export const getClientToken = (name?: string) =>
  name ? `${name.toUpperCase()}_CLIENT` : DEFAULT_CLIENT;
