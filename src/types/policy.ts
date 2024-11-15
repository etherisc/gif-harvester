
export interface Policy {
    nftId: BigInt;
    productNftId: BigInt;
    bundleNftId: BigInt;
    riskId: string;
    referralId: string | null;
    sumInsuredAmount: BigInt;
    premiumAmount: BigInt;
    premiumPaid: BigInt;
    lifetime: BigInt;
    activateAt: BigInt | null;
    created: {
        blockNumber: number;
        timestamp: BigInt;
        txHash: string;
        from: string;
    }
    modified: {
        blockNumber: number;
        timestamp: BigInt;
        txHash: string;
        from: string;
    }
}
