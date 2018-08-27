export class RoleEntity {
  id: number;
  name: string;

  constructor(partial: Partial<RoleEntity>) {
    Object.assign(this, partial);
  }
}
