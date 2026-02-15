import { Post } from './posts.interfaces.js';

export interface User {
  id: number;
  posts?: Post[];
}
