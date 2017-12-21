import { Connection } from 'mongoose';
import { CatSchema } from './schemas/cat.schema';

export const catsProviders = [
  {
    provide: 'CatModelToken',
    useFactory: (connection: Connection) => connection.model('Cat', CatSchema),
    inject: ['DbConnectionToken']
  }
];
