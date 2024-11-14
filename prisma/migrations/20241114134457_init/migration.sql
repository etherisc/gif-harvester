-- CreateTable
CREATE TABLE "Nft" (
    "nftId" BIGSERIAL NOT NULL,
    "parentNftId" BIGINT NOT NULL DEFAULT 0,
    "objectType" TEXT NOT NULL,
    "objectAddress" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "created_blockNumber" INTEGER NOT NULL,
    "created_txHash" TEXT NOT NULL,
    "created_from" TEXT NOT NULL,
    "modified_blockNumber" INTEGER NOT NULL,
    "modified_txHash" TEXT NOT NULL,
    "modified_from" TEXT NOT NULL,

    CONSTRAINT "Nft_pkey" PRIMARY KEY ("nftId")
);
