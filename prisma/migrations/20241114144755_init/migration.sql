-- CreateTable
CREATE TABLE "Instance" (
    "nftId" BIGINT NOT NULL,
    "instanceAddress" TEXT NOT NULL,
    "created_blockNumber" INTEGER NOT NULL,
    "created_txHash" TEXT NOT NULL,
    "created_from" TEXT NOT NULL,
    "modified_blockNumber" INTEGER NOT NULL,
    "modified_txHash" TEXT NOT NULL,
    "modified_from" TEXT NOT NULL,

    CONSTRAINT "Instance_pkey" PRIMARY KEY ("nftId")
);
