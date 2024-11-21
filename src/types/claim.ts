
export interface Claim {
    policyNftId: BigInt;
    claimId: BigInt;
    claimAmount: BigInt;
    confirmedAmount: BigInt | null;
    state: ClaimState;
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

export enum ClaimState {
    CREATED,
    CONFIRMED,
    DECLINED,
    REVOKED,
    CANCELLED
}
