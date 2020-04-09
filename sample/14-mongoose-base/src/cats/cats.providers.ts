import { Mongoose } from 'mongoose';
import { CatSchema } from './schemas/cat.schema';

export const catsProviders = [
  {
    provide: 'CAT_MODEL',
    useFactory: (mongoose: Mongoose) => mongoose.model('Cat', CatSchema),
    inject: ['DATABASE_CONNECTION'],
  },
];
