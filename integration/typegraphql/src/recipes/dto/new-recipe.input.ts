import { Type } from 'class-transformer';
import { Length, MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export class NewRecipeInput {
  @Field()
  @MaxLength(30)
  title: string;

  @Field({ nullable: true })
  @Length(30, 255)
  description?: string;

  @Type(() => String)
  @Field(type => [String])
  ingredients: string[];
}
