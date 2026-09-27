-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "in_stock" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);
