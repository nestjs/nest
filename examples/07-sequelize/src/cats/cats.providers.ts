import { Cat } from './cat.entity';

export const catsProviders = [
  {
    provide: 'CatsRepository',
    useValue: Cat,
  },
];
