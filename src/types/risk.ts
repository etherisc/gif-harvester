import { ObjectType } from "./objecttype";

export interface Risk {
    productNftId: BigInt;
    riskId: string;
    locked: boolean;
    closed: boolean;
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
