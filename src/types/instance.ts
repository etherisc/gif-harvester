import { ObjectType } from "./objecttype";

export interface Instance {
    nftId: BigInt;
    instanceAddress: string;
    created: {
        blockNumber: number;
        txHash: string;
        from: string;
    }
    modified: {
        blockNumber: number;
        txHash: string;
        from: string;
    }
}
