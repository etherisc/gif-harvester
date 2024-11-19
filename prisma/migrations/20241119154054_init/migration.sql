-- CreateTable
CREATE TABLE "Risk" (
    "productNftId" BIGINT NOT NULL,
    "riskId" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "created_blockNumber" INTEGER NOT NULL,
    "created_timestamp" BIGINT NOT NULL,
    "created_txHash" TEXT NOT NULL,
    "created_from" TEXT NOT NULL,
    "modified_blockNumber" INTEGER NOT NULL,
    "modified_timestamp" BIGINT NOT NULL,
    "modified_txHash" TEXT NOT NULL,
    "modified_from" TEXT NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("productNftId","riskId")
);
