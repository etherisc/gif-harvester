-- CreateTable
CREATE TABLE "Bundle" (
    "bundleNftId" BIGINT NOT NULL,
    "poolNftId" BIGINT NOT NULL,
    "lifetime" BIGINT NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "balance" BIGINT NOT NULL,
    "lockedAmount" BIGINT NOT NULL,
    "created_blockNumber" INTEGER NOT NULL,
    "created_timestamp" BIGINT NOT NULL,
    "created_txHash" TEXT NOT NULL,
    "created_from" TEXT NOT NULL,
    "modified_blockNumber" INTEGER NOT NULL,
    "modified_timestamp" BIGINT NOT NULL,
    "modified_txHash" TEXT NOT NULL,
    "modified_from" TEXT NOT NULL,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("bundleNftId")
);
