import { ObjectType } from "./objecttype";

export interface OracleRequest {
    oracleNftId: bigint;
    requesterNftId: bigint;
    requestId: bigint;
    expirationAt: bigint;
    state: OracleRequestState;
    objectAddress?: string;
    functionSignature?: string;
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

export enum OracleRequestState {
    PENDING,
    FULFILLED,
    DELIVERY_FAILED,
    RESENT,
    CANCELLED
}