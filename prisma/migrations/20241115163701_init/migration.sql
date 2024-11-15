-- CreateTable
CREATE TABLE "Policy" (
    "nftId" BIGINT NOT NULL,
    "productNftId" BIGINT NOT NULL,
    "bundleNftId" BIGINT NOT NULL,
    "riskId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "sumInsuredAmount" BIGINT NOT NULL,
    "premiumAmount" BIGINT NOT NULL,
    "premiumPaid" BIGINT NOT NULL,
    "lifetime" INTEGER NOT NULL,
    "activateAt" INTEGER NOT NULL,
    "created_blockNumber" INTEGER NOT NULL,
    "created_timestamp" INTEGER NOT NULL,
    "created_txHash" TEXT NOT NULL,
    "created_from" TEXT NOT NULL,
    "modified_blockNumber" INTEGER NOT NULL,
    "modified_timestamp" INTEGER NOT NULL,
    "modified_txHash" TEXT NOT NULL,
    "modified_from" TEXT NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("nftId")
);
