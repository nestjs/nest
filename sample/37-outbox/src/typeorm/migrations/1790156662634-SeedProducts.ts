import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedProducts1790156662634 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO "products" ("id", "name", "price", "in_stock") VALUES
              ('salmon-kibble-2kg', 'Salmon kibble, 2 kg', 2499, 10),
              ('clumping-litter-10l', 'Clumping litter, 10 l', 1599, 1)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DELETE FROM "products" WHERE "id" IN ('salmon-kibble-2kg', 'clumping-litter-10l')
        `);
  }
}
