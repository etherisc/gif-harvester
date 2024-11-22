import { PrismaClient } from "@prisma/client";
import { IBundleService__factory } from "./generated/contracts/gif";
import { logger } from "./logger";
import { Bundle } from "./types/bundle";
import { DecodedLogEntry } from "./types/logdata";

export default class BundleProcessor {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }
    
    async persistBundles(bundles: Bundle[]): Promise<void> {
        for (const bundle of bundles) {
            await this.prisma.bundle.upsert({
                where: { bundleNftId: bundle.bundleNftId },
                update: {
                    poolNftId: bundle.poolNftId,
                    lifetime: bundle.lifetime,
                    locked: bundle.locked,
                    closed: bundle.closed,
                    balance: bundle.balance,
                    lockedAmount: bundle.lockedAmount,
                    modified_blockNumber: bundle.modified.blockNumber,
                    modified_timestamp: bundle.modified.timestamp,
                    modified_txHash: bundle.modified.txHash,
                    modified_from: bundle.modified.from
                },
                create: {
                    bundleNftId: bundle.bundleNftId,
                    poolNftId: bundle.poolNftId,
                    lifetime: bundle.lifetime,
                    locked: bundle.locked,
                    closed: bundle.closed,
                    balance: bundle.balance,
                    lockedAmount: bundle.lockedAmount,
                    created_blockNumber: bundle.created.blockNumber,
                    created_timestamp: bundle.created.timestamp,
                    created_txHash: bundle.created.txHash,
                    created_from: bundle.created.from,
                    modified_blockNumber: bundle.modified.blockNumber,
                    modified_timestamp: bundle.modified.timestamp,
                    modified_txHash: bundle.modified.txHash,
                    modified_from: bundle.modified.from
                }
            });
        }
    }

    async processBundleCreatedEvent(event: DecodedLogEntry, bundles: Map<BigInt, Bundle>): Promise<Map<BigInt, Bundle>> {
        if (event.event_name !== 'LogBundleServiceBundleCreated') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.info(`Processing bundle created event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeBundleServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return bundles;
        }
        if (data.name !== 'LogBundleServiceBundleCreated') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const bundleNftId = data.args[0] as BigInt;
        const poolNftId = data.args[1] as BigInt;
        const lifetime = data.args[2] as BigInt;

        // TODO: validate poolNftId
        
        const bundle = {
            bundleNftId, 
            poolNftId,
            lifetime,
            locked: false,
            closed: false,
            balance: BigInt(0),
            lockedAmount: BigInt(0),
            created: {
                blockNumber: event.block_number,
                timestamp:BigInt(new Date(event.block_time).getTime()),
                txHash: event.tx_hash,
                from: event.tx_from
            },
            modified: {
                blockNumber: event.block_number,
                timestamp:BigInt(new Date(event.block_time).getTime()),
                txHash: event.tx_hash,
                from: event.tx_from
            }
        } as Bundle;
        bundles.set(bundleNftId, bundle);
        return bundles;
    }

    async processBundleClosedEvent(event: DecodedLogEntry, bundles: Map<BigInt, Bundle>): Promise<Map<BigInt, Bundle>> {
        if (event.event_name !== 'LogBundleServiceBundleClosed') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.info(`Processing bundle closed event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeBundleServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return bundles;
        }
        if (data.name !== 'LogBundleServiceBundleClosed') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const bundleNftId = data.args[0] as BigInt;
        const bundle = bundles.get(bundleNftId);
        if (bundle === undefined) {
            throw new Error(`Bundle not found ${bundleNftId}`);
        }
        bundle.closed = true;
        bundle.modified = {
            blockNumber: event.block_number,
            timestamp:BigInt(new Date(event.block_time).getTime()),
            txHash: event.tx_hash,
            from: event.tx_from
        };
        return bundles;
    }

    decodeBundleServiceEvent(event: DecodedLogEntry) {
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
        return IBundleService__factory.createInterface().parseLog({ topics: [topic0, topic1, topic2, topic3], data: event.data });
    }
}