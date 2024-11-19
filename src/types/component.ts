import { ObjectType } from "./objecttype";

export interface Component {
    nftId: BigInt;
    instanceNftId: BigInt;
    componentType: ObjectType;
    token: string;
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
