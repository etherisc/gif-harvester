-- CreateTable
CREATE TABLE "OracleRequest" (
    "requestId" BIGINT NOT NULL,
    "oracleNftId" BIGINT NOT NULL,
    "requesterNftId" BIGINT NOT NULL,
    "expirationAt" BIGINT NOT NULL,
    "state" INTEGER NOT NULL,
    "objectAddress" TEXT,
    "functionSignature" TEXT,
    "created_blockNumber" INTEGER NOT NULL,
    "created_timestamp" BIGINT NOT NULL,
    "created_txHash" TEXT NOT NULL,
    "created_from" TEXT NOT NULL,
    "modified_blockNumber" INTEGER NOT NULL,
    "modified_timestamp" BIGINT NOT NULL,
    "modified_txHash" TEXT NOT NULL,
    "modified_from" TEXT NOT NULL,

    CONSTRAINT "OracleRequest_pkey" PRIMARY KEY ("requestId")
);
