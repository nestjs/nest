import { Column, Model, Table } from 'sequelize-typescript';

@Table
export class Cat extends Model<Cat> {
  @Column
  name: string;

  @Column
  age: number;

  @Column
  breed: string;
}
