import { PrismaClient } from "@prisma/client";
import { getObjectType, ObjectType } from "./types/objecttype";
import { logger } from "./logger";
import { IRegistry__factory } from "./generated/contracts/gif";
import { DecodedLogEntry } from "./types/logdata";
import { Nft } from "./types/nft";
import { log } from "console";

export default class NftProcessor {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async persistNfts(nfts: Nft[]): Promise<void> {
        for (const nft of nfts) {
            await this.prisma.nft.upsert({
                where: { nftId: nft.nftId as bigint },
                update: {
                    parentNftId: nft.parentNftId as bigint,
                    objectType: ObjectType[nft.objectType],
                    objectAddress: nft.objectAddress,
                    owner: nft.owner,
                    modified_blockNumber: nft.modified.blockNumber,
                    modified_txHash: nft.modified.txHash,
                    modified_from: nft.modified.from
                },
                create: {
                    nftId: nft.nftId as bigint,
                    parentNftId: nft.parentNftId as bigint,
                    objectType: ObjectType[nft.objectType],
                    objectAddress: nft.objectAddress,
                    owner: nft.owner,
                    created_blockNumber: nft.created.blockNumber,
                    created_txHash: nft.created.txHash,
                    created_from: nft.created.from,
                    modified_blockNumber: nft.modified.blockNumber,
                    modified_txHash: nft.modified.txHash,
                    modified_from: nft.modified.from
                }
            });
        }
    }

    async processNftRegistrationEvent(event: DecodedLogEntry, nfts: Map<BigInt, Nft>): Promise<Map<BigInt, Nft>> {
        if (event.event_name !== 'LogRegistryObjectRegistered') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.info(`Processing nft registration event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeLogRegistryObjectRegisteredEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return nfts;
        }

        const nftId = data.args[0] as BigInt;
        const parentNftId = data.args[1] as BigInt;
        const objectType = getObjectType(BigInt(data.args[2]));
        const objectAddress = data.args[4] as string;
        const owner = data.args[5] as string;
        const nft = {
            nftId,
            parentNftId,
            objectType: objectType,
            objectAddress: objectAddress,
            owner: owner,
            created: {
                blockNumber: event.block_number,
                txHash: event.tx_hash,
                from: event.tx_from
            },
            modified: {
                blockNumber: event.block_number,
                txHash: event.tx_hash,
                from: event.tx_from
            }
        } as Nft;
        nfts.set(nftId, nft);
        return nfts;
    }

    async processNftTransferEvent(event: DecodedLogEntry, nfts: Map<BigInt, Nft>): Promise<Map<BigInt, Nft>> {
        if (event.event_name !== 'Transfer') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        const from = `0x${event.topic1.substring(26)}`;
        const to = `0x${event.topic2.substring(26)}`;
        const nftId = BigInt(event.topic3);
        
        if (nfts.has(nftId) && from === '0x0000000000000000000000000000000000000000') {
            logger.debug(`Initial nft event transfer ${nftId}`);
        } else if (nfts.has(nftId)) {
            logger.debug(`Transfer event from known nft ${nftId} from ${from} to ${to}`);
            const nft = nfts.get(nftId);
            if (nft === undefined) {
                logger.error(`NFT ${nftId} not found for update`);
                return nfts;
            }
            nft.owner = to;
            nft.modified = {
                blockNumber: event.block_number,
                txHash: event.tx_hash,
                from: event.tx_from
            };
        } else {
            logger.debug(`Transfer event from unknown nft ${nftId} from ${from} to ${to}`);
            const nft = {
                nftId,
                parentNftId: BigInt(0),
                objectType: ObjectType.UNKNOWN,
                objectAddress: '',
                owner: to,
                created: {
                    blockNumber: event.block_number,
                    txHash: event.tx_hash,
                    from: event.tx_from
                },
                modified: {
                    blockNumber: event.block_number,
                    txHash: event.tx_hash,
                    from: event.tx_from
                }
            };
            nfts.set(nftId, nft);
        }
        return nfts;
    }

    decodeLogRegistryObjectRegisteredEvent(event: DecodedLogEntry) {
        const topic0 = event.topic0;
        let topic1 = event.topic1;
        if (topic1 === null || topic1 === undefined || topic1 === '') {
            topic1 = '0x';
        }
        let topic2 = event.topic2;
        if (topic2 === null || topic2 === undefined || topic2 === '') {
            topic2 = '0x';
        }
        let topic3 = event.topic3;
        if (topic3 === null || topic3 === undefined || topic3 === '') {
            topic3 = '0x';
        }
        return IRegistry__factory.createInterface().parseLog({ topics: [topic0, topic1, topic2, topic3], data: event.data });
    }
}