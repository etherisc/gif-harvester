import { PrismaClient } from "@prisma/client";
import { getObjectType, ObjectType } from "./types/objecttype";
import { logger } from "./logger";
import { IApplicationService__factory, IPolicyService__factory, IRegistry__factory } from "./generated/contracts/gif";
import { DecodedLogEntry } from "./types/logdata";
import { Nft } from "./types/nft";
import { log } from "console";
import { Policy } from "./types/policy";

export default class PolicyProcessor {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async persistPolicies(policies: Policy[]): Promise<void> {
        // for (const nft of nfts) {
        //     await this.prisma.nft.upsert({
        //         where: { nftId: nft.nftId as bigint },
        //         update: {
        //             // parentNftId: nft.parentNftId as bigint,
        //             // objectType: ObjectType[nft.objectType],
        //             // objectAddress: nft.objectAddress,
        //             // owner: nft.owner,
        //             // modified_blockNumber: nft.modified.blockNumber,
        //             // modified_txHash: nft.modified.txHash,
        //             // modified_from: nft.modified.from
        //         },
        //         create: {
        //             nftId: nft.nftId as bigint,
        //             parentNftId: nft.parentNftId as bigint,
        //             objectType: ObjectType[nft.objectType],
        //             objectAddress: nft.objectAddress,
        //             owner: nft.owner,
        //             created_blockNumber: nft.created.blockNumber,
        //             created_txHash: nft.created.txHash,
        //             created_from: nft.created.from,
        //             modified_blockNumber: nft.modified.blockNumber,
        //             modified_txHash: nft.modified.txHash,
        //             modified_from: nft.modified.from
        //         }
        //     });
        // }
    }

    async processApplicationCreatedEvent(event: DecodedLogEntry, policies: Map<BigInt, Policy>): Promise<Map<BigInt, Policy>> {
        if (event.event_name !== 'LogApplicationServiceApplicationCreated') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing application created event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodeApplicationServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return policies;
        }
        if (data.name !== 'LogApplicationServiceApplicationCreated') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const nftId = data.args[0] as BigInt;
        const productNftId = data.args[1] as BigInt;
        const bundleNftId = data.args[2] as BigInt;
        const riskId = data.args[3] as string;
        const referralId = data.args[4] as string;
        const sumInsuredAmount = data.args[6] as BigInt;
        const premiumAmount = data.args[7] as BigInt;
        const lifetime = data.args[8] as number;
        
        const policy = {
            nftId,
            productNftId,
            bundleNftId,
            riskId,
            referralId,
            sumInsuredAmount,
            premiumAmount,
            premiumPaid: BigInt(0),
            lifetime,
            activateAt: null,
            created: {
                blockNumber: event.block_number,
                timestamp: new Date(event.block_time).getTime(),
                txHash: event.tx_hash,
                from: event.tx_from
            },
            modified: {
                blockNumber: event.block_number,
                timestamp: new Date(event.block_time).getTime(),
                txHash: event.tx_hash,
                from: event.tx_from
            }
        };
        policies.set(nftId, policy);

        logger.info(`ApplicationCreated event: ${policy.nftId} - ${policy.riskId} - ${policy.sumInsuredAmount} - ${policy.premiumAmount} - ${policy.lifetime}`);

        return policies;
    }

    async processPolicyCreatedEvent(event: DecodedLogEntry, policies: Map<BigInt, Policy>): Promise<Map<BigInt, Policy>> {
        if (event.event_name !== 'LogPolicyServicePolicyCreated') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing policy created event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodePolicyServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return policies;
        }
        if (data.name !== 'LogPolicyServicePolicyCreated') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const nftId = data.args[0] as BigInt;
        const premiumAmount = data.args[1] as BigInt;
        const activateAt = data.args[2] as number;
        
        const policy = policies.get(nftId);

        if (policy === undefined) {
            logger.error(`Policy not found for nftId ${nftId}`);
            return policies;
        }

        policy.premiumAmount = premiumAmount;
        policy.activateAt = activateAt;
        policy.modified = {
            blockNumber: event.block_number,
            timestamp: new Date(event.block_time).getTime(),
            txHash: event.tx_hash,
            from: event.tx_from
        };

        logger.info(`PolicyCreated event: ${policy.nftId} - ${policy.premiumAmount} - ${policy.activateAt}`);

        return policies;
    }

    async processPolicyPremiumCollectedEvent(event: DecodedLogEntry, policies: Map<BigInt, Policy>): Promise<Map<BigInt, Policy>> {
        if (event.event_name !== 'LogPolicyServicePolicyPremiumCollected') {
            throw new Error(`Invalid event type ${event.event_name}`);
        }

        logger.debug(`Processing policy created event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
        const data = this.decodePolicyServiceEvent(event);
        if (data === null || data === undefined) {
            logger.error(`Failed to decode event ${event.tx_hash} - ${event.event_name} - ${event.data}`);
            return policies;
        }
        if (data.name !== 'LogPolicyServicePolicyPremiumCollected') {
            throw new Error(`Invalid event name ${data.name}`);
        }

        const nftId = data.args[0] as BigInt;
        const premiumPaid = data.args[1] as BigInt;
        
        const policy = policies.get(nftId);

        if (policy === undefined) {
            logger.error(`Policy not found for nftId ${nftId}`);
            return policies;
        }

        policy.premiumPaid = premiumPaid;
        policy.modified = {
            blockNumber: event.block_number,
            timestamp: new Date(event.block_time).getTime(),
            txHash: event.tx_hash,
            from: event.tx_from
        };

        logger.info(`PolicyPremiumCollected event: ${policy.nftId} - ${policy.premiumPaid}`);

        return policies;
    }

    decodeApplicationServiceEvent(event: DecodedLogEntry) {
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
        return IApplicationService__factory.createInterface().parseLog({ topics: [topic0, topic1, topic2, topic3], data: event.data });
    }

    decodePolicyServiceEvent(event: DecodedLogEntry) {
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
        return IPolicyService__factory.createInterface().parseLog({ topics: [topic0, topic1, topic2, topic3], data: event.data });
    }
}