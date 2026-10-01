CREATE TABLE "order_events" (
	"seq" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_events_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" text NOT NULL,
	"event" text NOT NULL,
	"amount" integer NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "order_events_order_id" ON "order_events" USING btree ("order_id");