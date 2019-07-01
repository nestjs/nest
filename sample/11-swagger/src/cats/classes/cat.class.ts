import { ApiModelProperty } from '@nestjs/swagger';

export class Cat {
  @ApiModelProperty({ example: 'Kitty', description: 'The name of the Cat' })
  name: string;

  @ApiModelProperty({ example: 1, description: 'The age of the Cat' })
  age: number;

  @ApiModelProperty({
    example: 'Maine Coon',
    description: 'The breed of the Cat',
  })
  breed: string;
}
