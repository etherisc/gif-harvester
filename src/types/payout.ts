
export interface Payout {
    policyNftId: BigInt;
    payoutId: BigInt;
    claimId: BigInt;
    beneficiary: string;
    payoutAmount: BigInt;
    paidAmount: BigInt | null;
    cancelled: boolean;
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
