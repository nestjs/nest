import { Role } from './role.interface.js';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  password: string;
  role: Role;
}
