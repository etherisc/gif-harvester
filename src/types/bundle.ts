
export interface Bundle {
    bundleNftId: bigint;
    poolNftId: bigint;
    lifetime: bigint;
    locked: boolean;
    closed: boolean;
    balance: bigint;
    lockedAmount: bigint;
    created: {
        blockNumber: number;
        timestamp: bigint;
        txHash: string;
        from: string;
    }
    modified: {
        blockNumber: number;
        timestamp: bigint;
        txHash: string;
        from: string;
    }
}

