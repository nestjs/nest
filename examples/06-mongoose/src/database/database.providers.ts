import * as mongoose from 'mongoose';

export const databaseProviders = [
  {
    provide: 'DbConnectionToken',
    useFactory: async (): Promise<mongoose.Connection> =>
      await mongoose.connect('mongodb://localhost/nest'),
  },
];
