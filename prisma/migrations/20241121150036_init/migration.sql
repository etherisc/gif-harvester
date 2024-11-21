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
    "lifetime" BIGINT NOT NULL,
    "activateAt" BIGINT NOT NULL,
    "expirationAt" BIGINT,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "created_blockNumber" INTEGER NOT NULL,
    "created_timestamp" BIGINT NOT NULL,
    "created_txHash" TEXT NOT NULL,
    "created_from" TEXT NOT NULL,
    "modified_blockNumber" INTEGER NOT NULL,
    "modified_timestamp" BIGINT NOT NULL,
    "modified_txHash" TEXT NOT NULL,
    "modified_from" TEXT NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("nftId")
);

-- CreateTable
CREATE TABLE "Component" (
    "nftId" BIGINT NOT NULL,
    "instanceNftId" BIGINT NOT NULL,
    "componentType" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_blockNumber" INTEGER NOT NULL,
    "created_timestamp" BIGINT NOT NULL,
    "created_txHash" TEXT NOT NULL,
    "created_from" TEXT NOT NULL,
    "modified_blockNumber" INTEGER NOT NULL,
    "modified_timestamp" BIGINT NOT NULL,
    "modified_txHash" TEXT NOT NULL,
    "modified_from" TEXT NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("nftId")
);

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

-- CreateTable
CREATE TABLE "Claim" (
    "policyNftId" BIGINT NOT NULL,
    "claimId" BIGINT NOT NULL,
    "claimAmount" BIGINT NOT NULL,
    "confirmedAmount" BIGINT NOT NULL,
    "state" INTEGER NOT NULL,
    "created_blockNumber" INTEGER NOT NULL,
    "created_timestamp" BIGINT NOT NULL,
    "created_txHash" TEXT NOT NULL,
    "created_from" TEXT NOT NULL,
    "modified_blockNumber" INTEGER NOT NULL,
    "modified_timestamp" BIGINT NOT NULL,
    "modified_txHash" TEXT NOT NULL,
    "modified_from" TEXT NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("policyNftId","claimId")
);

-- CreateTable
CREATE TABLE "Payout" (
    "policyNftId" BIGINT NOT NULL,
    "payoutId" BIGINT NOT NULL,
    "claimId" BIGINT NOT NULL,
    "beneficiary" TEXT NOT NULL,
    "payoutAmount" BIGINT NOT NULL,
    "paidAmount" BIGINT NOT NULL,
    "cancelled" BOOLEAN NOT NULL,
    "created_blockNumber" INTEGER NOT NULL,
    "created_timestamp" BIGINT NOT NULL,
    "created_txHash" TEXT NOT NULL,
    "created_from" TEXT NOT NULL,
    "modified_blockNumber" INTEGER NOT NULL,
    "modified_timestamp" BIGINT NOT NULL,
    "modified_txHash" TEXT NOT NULL,
    "modified_from" TEXT NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("policyNftId","payoutId")
);
