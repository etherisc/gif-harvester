import { PrismaClient } from "@prisma/client";
import { getObjectType, ObjectType } from "./types/objecttype";
import { logger } from "./logger";
import { IRegistry__factory } from "./generated/contracts/gif";
import { DecodedLogEntry } from "./types/logdata";
import { Nft } from "./types/nft";

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

    async processNftRegistrationEvents(nftRegistrationEvents: Array<DecodedLogEntry>): Promise<Array<Nft>> {
        return nftRegistrationEvents.map(event => {
            logger.info(`Processing nft registration event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            const data = this.decodeLogRegistryObjectRegisteredEvent(event);
            if (data === null || data === undefined) {
                logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
                return null as unknown as Nft;
            }
            const nftId = data.args[0] as BigInt;
            const parentNftId = data.args[1] as BigInt;
            const objectType = getObjectType(BigInt(data.args[2]));
            const objectAddress = data.args[4] as string;
            const owner = data.args[5] as string;
            return {
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
        }).filter(event => event !== null);
    }

    async processNftTransferEvents(nftTransferEvents: Array<DecodedLogEntry>, nfts: Array<Nft>): Promise<Array<Nft>> {
        nftTransferEvents.forEach(event => {
            logger.debug(`Processing nft transfer event ${event.tx_hash} - ${event.event_name} - ${event.topic0} - ${event.topic1} - ${event.topic2} - ${event.topic3} - ${event.data}`);
            // extract addresses
            const from = `0x${event.topic1.substring(26)}`;
            const to = `0x${event.topic2.substring(26)}`;
            const nftId = BigInt(event.topic3);
            // logger.debug(`Transfer from ${from} to ${to} for NFT ${nftId}`);

            if (from === '0x0000000000000000000000000000000000000000') {
                return;
            }

            const nft = nfts.find(nft => nft.nftId === nftId);
            if (nft === undefined) {
                logger.error(`NFT ${nftId} not found`);
                return;
            }
            nft.owner = to;
            nft.modified = {
                blockNumber: event.block_number,
                txHash: event.tx_hash,
                from: event.tx_from
            };
            logger.debug(`Transfer NFT ${nftId} from ${from} to ${to}`);
        });
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