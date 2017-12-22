import * as mongoose from 'mongoose';
import { Mockgoose } from 'mockgoose';

export const databaseProviders = [
  {
    provide: 'DbToken',
    useFactory: async () => {
      (mongoose as any).Promise = global.Promise;

      if (process.env.NODE_ENV === 'test') {
        const mockgoose = new Mockgoose(mongoose);
        mockgoose.helper.setDbVersion('3.4.3');

        mockgoose.prepareStorage().then(async () => {
          await mongoose.connect('mongodb://example.com/TestingDB', {
            useMongoClient: true,
          });
        });
      } else {
        await mongoose.connect('mongodb://localhost/nest', {
          useMongoClient: true,
        });
      }

      return mongoose;
    },
  },
];
