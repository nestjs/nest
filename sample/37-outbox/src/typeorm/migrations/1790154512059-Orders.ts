import { MigrationInterface, QueryRunner } from 'typeorm';

export class Orders1790154512059 implements MigrationInterface {
  name = 'Orders1790154512059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "products" (
                "id" text NOT NULL,
                "name" text NOT NULL,
                "price" integer NOT NULL,
                "in_stock" integer NOT NULL,
                "reserved" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "orders" (
                "id" uuid NOT NULL,
                "user_id" text NOT NULL,
                "items" jsonb NOT NULL,
                "total" integer NOT NULL,
                "status" text NOT NULL,
                CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "orders"
        `);
    await queryRunner.query(`
            DROP TABLE "products"
        `);
  }
}
