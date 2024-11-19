import { PrismaClient } from "@prisma/client";
import { IRiskService__factory } from "./generated/contracts/gif";
import { logger } from "./logger";
import { DecodedLogEntry } from "./types/logdata";
import { Risk } from "./types/risk";

export default class RiskProcessor {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async persistRisks(risks: Risk[]): Promise<void> {
        for (const risk of risks) {
            await this.prisma.risk.upsert({
                where: { productNftId_riskId: { productNftId: risk.productNftId as bigint, riskId: risk.riskId } },
                update: {
                    locked: risk.locked,
                    closed: risk.closed,
                    modified_blockNumber: risk.modified.blockNumber,
                    modified_timestamp: risk.modified.timestamp as bigint,
                    modified_txHash: risk.modified.txHash,
                    modified_from: risk.modified.from
                },
                create: {
                    productNftId: risk.productNftId as bigint,
                    riskId: risk.riskId,
                    locked: risk.locked,
                    closed: risk.closed,
                    created_blockNumber: risk.created.blockNumber,
                    created_timestamp: risk.created.timestamp as bigint,
                    created_txHash: risk.created.txHash,
                    created_from: risk.created.from,
                    modified_blockNumber: risk.modified.blockNumber,
                    modified_timestamp: risk.modified.timestamp as bigint,
                    modified_txHash: risk.modified.txHash,
                    modified_from: risk.modified.from
                }
            });
        }
    }

    async processRiskCreatedEvent(event: DecodedLogEntry, risks: Map<string, Risk>): Promise<Map<string, Risk>> {
        if (event.event_name !== 'LogRiskServiceRiskCreated') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.info(`Processing risk creation event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeRiskServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return risks;
        }
        if (data.name !== 'LogRiskServiceRiskCreated') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const productNftId = data.args[0] as BigInt;
        const riskId = data.args[1] as string;
        const key = `${productNftId}_${riskId}`;
        
        const risk = {
            productNftId,
            riskId,
            locked: false,
            closed: false,
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
        } as Risk;
        risks.set(key, risk);
        return risks;
    }

    decodeRiskServiceEvent(event: DecodedLogEntry) {
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
        return IRiskService__factory.createInterface().parseLog({ topics: [topic0, topic1, topic2, topic3], data: event.data });
    }
}