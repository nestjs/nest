import { ApiModelProperty } from '@nestjs/swagger';

export class Cat {
  @ApiModelProperty()
  id: number;

  @ApiModelProperty()
  name: string;

  @ApiModelProperty()
  age: number;

  @ApiModelProperty()
  breed: string;
}
