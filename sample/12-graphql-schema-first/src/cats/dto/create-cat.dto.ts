import { Min } from 'class-validator';
import { CreateCatInput } from '../../graphql.schema';

export const MINIMUM_AGE = 1;
export const MINIMUM_AGE_ERROR = `Age must be greater than ${MINIMUM_AGE}`;

export class CreateCatDto extends CreateCatInput {
  @Min(MINIMUM_AGE, { message: MINIMUM_AGE_ERROR })
  age: number;
}
