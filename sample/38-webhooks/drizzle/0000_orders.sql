CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"partner_id" text NOT NULL,
	"items" jsonb NOT NULL,
	"total" integer NOT NULL,
	"status" text NOT NULL,
	"payment_id" text,
	"tracking_number" text
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"api_key_hash" text NOT NULL,
	CONSTRAINT "partners_api_key_hash_unique" UNIQUE("api_key_hash")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;