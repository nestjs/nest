-- CreateTable
CREATE TABLE "outbox_messages" (
    "seq" BIGSERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB,
    "headers" JSONB NOT NULL,
    "key" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "available_at" TIMESTAMPTZ(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "history" JSONB NOT NULL DEFAULT '[]',
    "lease_owner" TEXT,
    "lease_until" TIMESTAMPTZ(3),

    CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "outbox_dead_letters" (
    "id" TEXT NOT NULL,
    "seq" BIGINT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB,
    "headers" JSONB NOT NULL,
    "key" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "attempts" INTEGER NOT NULL,
    "last_error" TEXT,
    "history" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "failed_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "outbox_dead_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_inbox" (
    "consumer" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "processed_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "outbox_inbox_pkey" PRIMARY KEY ("consumer","message_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outbox_messages_id_key" ON "outbox_messages"("id");

-- CreateIndex
CREATE INDEX "outbox_messages_key_seq" ON "outbox_messages"("key", "seq");

-- CreateIndex
CREATE INDEX "outbox_dead_letters_topic_failed_at" ON "outbox_dead_letters"("topic", "failed_at");

-- CreateIndex
CREATE INDEX "outbox_inbox_processed_at" ON "outbox_inbox"("processed_at");
