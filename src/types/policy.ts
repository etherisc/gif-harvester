
export interface Policy {
    nftId: BigInt;
    productNftId: BigInt;
    bundleNftId: BigInt;
    riskId: string;
    referralId: string | null;
    sumInsuredAmount: BigInt;
    premiumAmount: BigInt;
    premiumPaid: BigInt;
    lifetime: number;
    activateAt: number | null;
    created: {
        blockNumber: number;
        timestamp: number;
        txHash: string;
        from: string;
    }
    modified: {
        blockNumber: number;
        timestamp: number;
        txHash: string;
        from: string;
    }
}
