import { ObjectType } from "./objecttype";

export interface Nft {
    nftId: BigInt;
    parentNftId: BigInt;
    objectType: ObjectType;
    objectAddress: string;
    owner: string;
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
